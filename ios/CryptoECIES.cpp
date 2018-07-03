//
//  CryptoECIES.cpp
//  stealthy
//
//  Created by aycarrei on 6/26/18.
//  Copyright © 2018 Stealthy. All rights reserved.
//

#include "CryptoECIES.hpp"
#include <iostream>

#include "cryptopp/cryptlib.h"
#include "cryptopp/oids.h"
#include "cryptopp/osrng.h"
#include "cryptopp/eccrypto.h"
#include "cryptopp/asn.h"
#include "cryptopp/ecp.h"
#include "cryptopp/ec2n.h"
#include "cryptopp/simple.h"
#include "cryptopp/hex.h"
#include "cryptopp/modes.h"
#include "cryptopp/misc.h"

#define ECC_ALGORITHM CryptoPP::ECP
#define ECC_CURVE CryptoPP::ASN1::secp256k1()

using std::cout;
using std::cerr;
using std::endl;
using std::exception;
using std::string;

// ... because lazy:
using namespace CryptoPP;

// Reduce iOS deployment size
#define DEBUG_PRINT_METHODS true

#ifdef DEBUG_PRINT_METHODS
void printCipherObj(const CipherObject& aCipherObj);

void printByteArrAsHex(const string& varName, const byte* byteArr, const size_t byteArrLen);
void printBinAsHex(const string& varName, const string& binStr);
void printSecByteBlockAsHex(const string& varName, const SecByteBlock& secByteBlock);
#endif /* DEBUG_PRINT_METHODS */


void byteArrToHexStr(const byte* aByteArr, const size_t theByteArrLen, string& aHexStr);
void binStrToHexStr(const string& aBinStr, string& aHexStr);

void secByteBlockToBinStr(const SecByteBlock& aSecByteBlock, string& aBinStr);

void hexStrToBinStr(const string& aHexStr, string& aBinStr);
void hexStrToByteVec(const string& aHexStr, std::vector<byte>& aByteVec);

// Gets the provided ephemeral public key in DER format compressed or uncompressed as specified:
string getConvertedPublicKey(AutoSeededRandomPool& rng, const SecByteBlock& ephPk, const bool compress);
string getConvertedPublicKey(AutoSeededRandomPool& rng, const string ephPk, const bool compress);



CipherObject CryptoECIES::EncryptECIES(const string& publicKey, const string& content) {
  CipherObject encObj;
  {
    AutoSeededRandomPool rng;
    
    //
    // Replicate BLOCKSTACK encryptECIES(publicKey, content):
    //////////////////////////////////////////////////////////////////////////////////////
    //
    // 1. Get uncompressed public key in binary:
    //    (From the encrypt/decrypt from known keys SO answer)
    //    TODO: can we do this from the domain/group (i.e without creating an encryptor)?
    // ----------------------------------------------------------------------------------
    string pubKeyBin; 
    hexStrToBinStr(publicKey, pubKeyBin);
    const string pubKeyBinUncomp = getConvertedPublicKey(rng, pubKeyBin, false /* compress */);
    //
    //
    // 2. Create a pair of ephemoral keys on the elliptic curve:
    //    Method: (https://stackoverflow.com/questions/32832661/use-ecdh-key-with-ecies)
    //      - Note: ECP does not use AuthenticatedKeyAgreementDomain -- i.e. you can't call the following on this domain:
    //              * EphemeralPrivateKeyLength()
    //              * GenerateEphemeralKeyPair(rng, priv, pub);
    //              It supports SimpleKeyAgreementDomain, hence call to GenerateKeyPair
    //      - Note 2: The Blockstack encryptECIES method calls the library elliptical, which appears to be using DH for
    //                key agreement (https://github.com/indutny/elliptic/blob/master/lib/elliptic/ec/key.js - look at derive)
    //      - Note 3: More support for this approach: https://groups.google.com/forum/#!topic/cryptopp-users/x7TpgliHjZ4
    // ----------------------------------------------------------------------------------
    ECDH<ECC_ALGORITHM>::Domain domain(ECC_CURVE);
    SecByteBlock eph_prv(domain.PrivateKeyLength()), eph_pub(domain.PublicKeyLength());
    domain.GenerateKeyPair(rng, eph_prv, eph_pub);
    //
    //
    // 3. Generate the shared secret:
    //    Method: (variant of: https://www.cryptopp.com/wiki/Elliptic_Curve_Diffie-Hellman#Ephemeral_Key_as_.28x.2Cy.29
    //             more here:  https://stackoverflow.com/questions/33198362/using-public-key-coordinate-with-cryptos-ecdh-class)
    //    SO post on ECDH v. ECIES for key exchange/shared secret: https://stackoverflow.com/questions/30667626/key-exchange-using-ecdh-vs-ecies
    //    Hardcore way w/ scalar multiply similar to js derive(): https://groups.google.com/forum/#!searchin/cryptopp-users/ephemeral$20key|sort:date/cryptopp-users/HQ4cWCO12PQ/Jjl11UseEwAJ
    // ----------------------------------------------------------------------------------
    SecByteBlock sharedKey(domain.AgreedValueLength());
    if (!domain.Agree(sharedKey, eph_prv, (byte*) &pubKeyBinUncomp[0])) {
      throw("ERROR: Domain does not agree for shared key in encryptor");
    }
    //
    //
    // 4. Implement Blockstack::encryption.js::sharedSecretToKeys
    //    (generates mac and shared encryption key, see: https://www.cryptopp.com/wiki/Hash_functions)
    // ----------------------------------------------------------------------------------
    SHA512 sha512Hash;
    byte hashedSecretDigest[SHA512::DIGESTSIZE];
    sha512Hash.CalculateDigest(hashedSecretDigest, sharedKey, sharedKey.size());
    // (js) sharedEncryptionKey: hashedSecretDigest.slice(0,32):
    byte sharedEncryptionKey[32];
    std::copy(hashedSecretDigest, hashedSecretDigest+32, sharedEncryptionKey);
    // (js) sharedHmacKey: hashedSecretDigest.slice(32):
    size_t sharedHmacKeyLen = SHA512::DIGESTSIZE - 32;
    byte sharedHmacKey[sharedHmacKeyLen];
    std::copy(hashedSecretDigest+32, hashedSecretDigest+(SHA512::DIGESTSIZE), sharedHmacKey);
    //
    //
    // 5. Construct initialization vector: (from: https://www.cryptopp.com/wiki/CBC_Mode)
    // ----------------------------------------------------------------------------------
    const size_t ivLen = 16;
    byte iv[ivLen];
    rng.GenerateBlock(iv, sizeof(iv));
    byteArrToHexStr(iv, ivLen, encObj.iv);
    //
    //
    // 6. Perform AES 256 CBC Encryption:
    //    Note: AES-256 is implicit from 32-byte key length (see https://www.cryptopp.com/wiki/Advanced_Encryption_Standard)
    //    Based on: https://www.cryptopp.com/wiki/CBC_Mode
    // ----------------------------------------------------------------------------------
    string cipher;
    CBC_Mode<AES>::Encryption aesE;
    size_t shEncKeyLen = sizeof(sharedEncryptionKey)/sizeof(sharedEncryptionKey[0]);    // should be 32
    aesE.SetKeyWithIV(sharedEncryptionKey, shEncKeyLen, iv);
    //    method 1 (from cryptopp wiki):
    try {
        StringSource aesSS(content, true, new StreamTransformationFilter(aesE, new StringSink(cipher)));
    } catch (const CryptoPP::Exception& e) {
      cerr << "AES Encryption Error: "<< e.what() << endl;
      throw(e);
    }
    binStrToHexStr(cipher, encObj.cipherText);
    //
    //
    // 7. Compute MAC (Message Authentication Code)
    // ----------------------------------------------------------------------------------
    //  a) compress ephemeral public key
    string compEphKeyDer = getConvertedPublicKey(rng, eph_pub, true /* compress */);
    binStrToHexStr(compEphKeyDer, encObj.ephemeralPK);
    //
    string ivBinStr;
    hexStrToBinStr(encObj.iv, ivBinStr);
    // b. Concatenate iv, compressed ephemeral PK & cipher text to get macData
    string macData = ivBinStr + compEphKeyDer + cipher;
    //  c) compute the mac
    HMAC<SHA256> hmac(sharedHmacKey, sharedHmacKeyLen);
    hmac.Update((byte*)&macData[0], macData.size());
    byte mac[HMAC<SHA256>::DIGESTSIZE];
    hmac.Final(mac);
    byteArrToHexStr(mac, HMAC<SHA256>::DIGESTSIZE, encObj.mac);
    
//    printCipherObj(encObj);
  }
  
  return encObj;
}

string CryptoECIES::DecryptECIES(const string& privateKeyHex, const CipherObject& cipherObject) {
  AutoSeededRandomPool rng;

  //
  // Replicate BLOCKSTACK decryptECIES(privateKey, cipherObject):
  //////////////////////////////////////////////////////////////////////////////////////
  //
  // 1. Convert the private key and ephemeral public key hex strings to binary strings
  // ----------------------------------------------------------------------------------
  string privateKey;
  hexStrToBinStr(privateKeyHex, privateKey);
  //
  const string ephemeralPKHex = cipherObject.ephemeralPK;
  string ephemeralPK;
  hexStrToBinStr(ephemeralPKHex, ephemeralPK);
  //
  //
  // 2. Uncompress the ephemoral public key (required for deriving shared secret)
  // ----------------------------------------------------------------------------------
  string uncomEphemeralPKBin = getConvertedPublicKey(rng, ephemeralPK, false /* compress */);
  //
  //
  // 3. Compute the shared secret
  // ----------------------------------------------------------------------------------
  ECDH<ECC_ALGORITHM>::Domain domain(ECC_CURVE);
  SecByteBlock sharedKey(domain.AgreedValueLength());
  if (!domain.Agree(sharedKey, (byte*) &privateKey[0], (byte*) &uncomEphemeralPKBin[0])) {
    throw("FAIL: DOMAIN DOES NOT AGREE!");
  }
  //
  //
  // 4. Implement Blockstack::encryption.js::sharedSecretToKeys (mac and encryption key)
  // ----------------------------------------------------------------------------------
  SHA512 sha512Hash;
  byte hashedSecretDigest[SHA512::DIGESTSIZE];
  sha512Hash.CalculateDigest(hashedSecretDigest, sharedKey, sharedKey.size());
  // (js) sharedEncryptionKey: hashedSecretDigest.slice(0,32)
  byte sharedEncryptionKey[32];
  std::copy(hashedSecretDigest, hashedSecretDigest+32, sharedEncryptionKey);
  // (js) sharedHmacKey: hashedSecretDigest.slice(32);B
  size_t sharedHmacKeyLen = SHA512::DIGESTSIZE - 32;
  byte sharedHmacKey[sharedHmacKeyLen];
  std::copy(hashedSecretDigest+32,
            hashedSecretDigest+(SHA512::DIGESTSIZE),
            sharedHmacKey);
  //
  //
  // 5. Convert initialization vector & cipher text to byte arr.
  // ----------------------------------------------------------------------------------
  string iv, cipherText;
  hexStrToBinStr(cipherObject.iv, iv);
  hexStrToBinStr(cipherObject.cipherText, cipherText);
  //
  //
  // 6. Concatenate iv, compressed ephemeral PK & cipher text to get macData
  // ----------------------------------------------------------------------------------
  string macData = iv + ephemeralPK + cipherText;
  //
  //
  // 7. Compute the actual mac:
  // ----------------------------------------------------------------------------------
  HMAC<SHA256> hmac(sharedHmacKey, sharedHmacKeyLen);
  hmac.Update((byte*)&macData[0], macData.size());
  const size_t actualMacSize = HMAC<SHA256>::DIGESTSIZE;
  byte actualMac[actualMacSize];
  hmac.Final(actualMac);
  //
  //
  // 8. Compare the actualMac to the provided mac:
  // ----------------------------------------------------------------------------------
  string expectedMac;
  hexStrToBinStr(cipherObject.mac, expectedMac);
  
  printBinAsHex("privateKey", privateKey);
  printBinAsHex("ephemeralPK", ephemeralPK);
  printBinAsHex("uncoEphemeralPKBin", uncomEphemeralPKBin);
  printSecByteBlockAsHex("sharedKey", sharedKey);
  printByteArrAsHex("sharedEncryptionKey", sharedEncryptionKey, 32);
  printByteArrAsHex("sharedHmacKey", sharedHmacKey, sharedHmacKeyLen);
  printBinAsHex("macData", macData);
  printByteArrAsHex("actualMac", actualMac, actualMacSize);
  printBinAsHex("expectedMac", expectedMac);
  
  if ((expectedMac.size() != actualMacSize) ||
      !VerifyBufsEqual((byte*) &expectedMac[0], actualMac, actualMacSize))
  {
    throw("FAIL: expectedMac is not equal to actualMac");
  }
  //
  //
  // 9. Decrypt the cipherText (https://www.cryptopp.com/wiki/CBC_Mode)
  // ----------------------------------------------------------------------------------
  CBC_Mode<AES>::Decryption d;
  const size_t sharedKeySize = 32;
  d.SetKeyWithIV(sharedEncryptionKey, sharedKeySize, (byte*)&iv[0]);
  //
  //    Stream transformation filter to handle padding.
  string recovered;
  StringSource ss(cipherText, true,
                  new StreamTransformationFilter(d, new StringSink(recovered)));
  
  return recovered;
}



#ifdef DEBUG_PRINT_METHODS
void printCipherObj(const CipherObject& aCipherObj) {
  cout << "encData = {" << endl;
  cout << "  cipherText : \"" << aCipherObj.cipherText << "\"," << endl;
  cout << "  ephemeralPK : \"" << aCipherObj.ephemeralPK << "\"," << endl;
  cout << "  iv : \"" << aCipherObj.iv << "\"," << endl;
  cout << "  mac : \"" << aCipherObj.mac << "\"" << endl;
  cout << "}" << endl;
}

void printByteArrAsHex(const string& varName, const byte* byteArr, const size_t byteArrLen) {
  string hexEncodedStr;
  StringSource ss(byteArr, byteArrLen, true, new HexEncoder(new StringSink(hexEncodedStr)));
  cout << varName << " : \"" << hexEncodedStr << "\""
  << ", size = " << hexEncodedStr.size()
  << ", (byteArr length = " << byteArrLen << ")" << endl;
}

void printBinAsHex(const string& varName, const string& binStr) {
  string hexEncodedStr;
  StringSource ss(binStr, true, new HexEncoder(new StringSink(hexEncodedStr)));
  cout << varName << " : \"" << hexEncodedStr << "\"" << ", size = " << hexEncodedStr.size() << endl;
}

void printSecByteBlockAsHex(const string& varName, const SecByteBlock& secByteBlock) {
  string sbbStr = string((const char*) secByteBlock.data(), secByteBlock.size());
  printBinAsHex(varName, sbbStr);
}
#endif /* DEBUG_PRINT_METHODS */

void byteArrToHexStr(const byte* aByteArr, const size_t theByteArrLen, string& aHexStr) {
  StringSource ss(aByteArr, theByteArrLen, true, new HexEncoder(new StringSink(aHexStr)));
}

void binStrToHexStr(const string& aBinStr, string& aHexStr) {
  StringSource ss(aBinStr, true, new HexEncoder(new StringSink(aHexStr)));
}

void secByteBlockToBinStr(const SecByteBlock& aSecByteBlock, string& aBinStr) {
  aBinStr = string((const char*) aSecByteBlock.data(), aSecByteBlock.size());
}

void hexStrToBinStr(const string& aHexStr, string& aBinStr) {
  StringSource ss(aHexStr, true, new HexDecoder(new StringSink(aBinStr)));
}

// TODO: could make this more efficient (direct to byte vec)
void hexStrToByteVec(const string& aHexStr, std::vector<byte>& aByteVec) {
  string binStr;
  hexStrToBinStr(aHexStr, binStr);

  aByteVec.resize(binStr.size());
  std::copy((byte*) &binStr[0], (byte*) &binStr[0] + binStr.size(), &aByteVec[0]);
}

string getConvertedPublicKey(AutoSeededRandomPool& rng, const SecByteBlock& publicKey, const bool compress) {
  string publicKeyBinStr;
  secByteBlockToBinStr(publicKey, publicKeyBinStr);
  return getConvertedPublicKey(rng, publicKeyBinStr, compress);
}

string getConvertedPublicKey(AutoSeededRandomPool& rng, const string publicKeyBinStr, const bool compress) {
  // Initialize encryptor with our alg/curve.
  ECIES<ECC_ALGORITHM>::Encryptor e1;
  e1.AccessKey().AccessGroupParameters().Initialize(ECC_CURVE);
  e1.AccessKey().AccessGroupParameters().SetPointCompression(compress);

  // Initialize the point on the EC from our public key
  ECC_ALGORITHM::Point point2;
  e1.GetKey().GetGroupParameters().GetCurve().DecodePoint(point2, (byte*)&publicKeyBinStr[0], publicKeyBinStr.size());
  e1.AccessKey().SetPublicElement(point2);

  // Check if the initialization is valid
  e1.AccessKey().ThrowIfInvalid(rng, 3);

  // Get the public key in converted binary format
  string convPublicKeyBinStr;
  e1.GetPublicKey().Save(StringSink(convPublicKeyBinStr).Ref());

  // Now apply DER encoding to get the key's private info
  ByteQueue kbq;
  e1.GetKey().DEREncodePublicKey(kbq);
  string convPublicKeyBinStrDer;
  StringSink kss(convPublicKeyBinStrDer);
  kbq.CopyTo(kss);
  kss.MessageEnd();

  return convPublicKeyBinStrDer;
}
