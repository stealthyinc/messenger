//
//  CryptoECIES.cpp
//  stealthy
//
//  Created by aycarrei on 6/26/18.
//  Copyright © 2018 Facebook. All rights reserved.
//

#include "CryptoECIES.hpp"
#include <iostream>

CipherObject EncryptECIES(const std::string& publicKey, const std::string& content) {
  std::cout << "CryptoECIES::EncryptECIES" << std::endl;
  
  CipherObject result;
  return result;
}

void EncryptECIESWrapper(const std::string& publicKey,
                         const std::string& content,
                         std::string& cipherText,
                         std::string& ephemeralPK,
                         std::string& iv,
                         std::string& mac,
                         bool& wasString) {
  std::cout << "CryptoECIES::EncryptECIESWrapper" << std::endl;
}

std::string DecryptECIES(const std::string& privateKey, const std::string& cipherObject) {
  std::cout << "CryptoECIES::DecryptECIES" << std::endl;
  
  return "";
}

std::string DecryptECIESWrapper(const std::string& privateKey,
                                const std::string& cipherText,
                                const std::string& ephemeralPK,
                                const std::string& iv,
                                const std::string& mac,
                                const bool wasString) {
  std::cout << "CryptoECIES::DecryptECIESWrapper" << std::endl;
  
  return "";
}


//
//#include "cryptopp/cryptlib.h"
//#include "cryptopp/oids.h"
//#include "cryptopp/osrng.h"
//#include "cryptopp/eccrypto.h"
//#include "cryptopp/asn.h"
//#include "cryptopp/ecp.h"
//#include "cryptopp/ec2n.h"
//#include "cryptopp/simple.h"
//#include "cryptopp/hex.h"
//#include "cryptopp/modes.h"
//#include "cryptopp/misc.h"
//
//#define ECC_ALGORITHM CryptoPP::ECP
//#define ECC_CURVE CryptoPP::ASN1::secp256k1()
//
//using std::cout;
//using std::cerr;
//using std::endl;
//using std::runtime_error;
//using std::exception;
//
//// ... because lazy:
//using namespace CryptoPP;
//
//// Apparently CryptoPP::byte didn't make it to iOS. Defining it as unsigned int.
////typedef unsigned int byte;
//
//
//void printCipherObj(const CipherObject& aCipherObj);
//
//void printByteArrAsHex(const std::string& varName, const byte* byteArr, const size_t byteArrLen);
//void printBinAsHex(const std::string& varName, const std::string& binStr);
//void printSecByteBlockAsHex(const std::string& varName, const SecByteBlock& secByteBlock);
//
//void byteArrToHexStr(const byte* aByteArr, const size_t theByteArrLen, std::string& aHexStr);
//void binStrToHexStr(const std::string& aBinStr, std::string& aHexStr);
//void secByteBlockToHexStr(const SecByteBlock& aSecByteBlock, std::string& aHexStr);
//
//void hexStrToBinStr(const std::string& aHexStr, std::string& aBinStr);
//void hexStrToByteVec(const std::string& aHexStr, std::vector<byte>& aByteVec);
//
//std::string getCompressedEphemeralPublicKey(AutoSeededRandomPool& rng, const SecByteBlock& ephPk);
//
//std::string getUnCompressedEphemeralPublicKey(AutoSeededRandomPool& rng, const std::string ephPk);
//
//
//
//CipherObject EncryptECIES(const std::string& publicKey, const std::string& content) {
//}
//
//void EncryptECIESWrapper(const std::string& publicKey,
//                         const std::string& content,
//                         std::string& cipherText,
//                         std::string& ephemeralPK,
//                         std::string& iv,
//                         std::string& mac,
//                         bool& wasString) {
//
//}
//
//std::string DecryptECIES(const std::string& privateKey, const std::string& cipherObject) {
//
//}
//
//std::string DecryptECIESWrapper(const std::string& privateKey,
//                                const std::string& cipherText,
//                                const std::string& ephemeralPK,
//                                const std::string& iv,
//                                const std::string& mac,
//                                const bool wasString) {
//
//}
//
//
//void printCipherObj(const CipherObject& aCipherObj) {
//  cout << "encData = {" << endl;
//  cout << "  cipherText : \"" << aCipherObj.cipherText << "\"," << endl;
//  cout << "  ephemeralPK : \"" << aCipherObj.ephemeralPK << "\"," << endl;
//  cout << "  iv : \"" << aCipherObj.iv << "\"," << endl;
//  cout << "  mac : \"" << aCipherObj.mac << "\"," << endl;
//  cout << "  wasString : " << (aCipherObj.wasString ? "true" : "false") << endl;
//  cout << "}" << endl;
//}
//
//void printByteArrAsHex(const std::string& varName, const byte* byteArr, const size_t byteArrLen) {
//  std::string hexEncodedStr;
//  StringSource ss(byteArr, byteArrLen, true, new HexEncoder(new StringSink(hexEncodedStr)));
//  cout << varName << " : \"" << hexEncodedStr << "\""
//  << ", size = " << hexEncodedStr.size()
//  << ", (byteArr length = " << byteArrLen << ")" << endl;
//}
//
//void printBinAsHex(const std::string& varName, const std::string& binStr) {
//  std::string hexEncodedStr;
//  StringSource ss(binStr, true, new HexEncoder(new StringSink(hexEncodedStr)));
//  cout << varName << " : \"" << hexEncodedStr << "\"" << ", size = " << hexEncodedStr.size() << endl;
//}
//
//void printSecByteBlockAsHex(const std::string& varName, const SecByteBlock& secByteBlock) {
//  std::string sbbStr = std::string((const char*) secByteBlock.data(), secByteBlock.size());
//  printBinAsHex(varName, sbbStr);
//}
//
//
//void byteArrToHexStr(const byte* aByteArr, const size_t theByteArrLen, std::string& aHexStr) {
//  StringSource ss(aByteArr, theByteArrLen, true, new HexEncoder(new StringSink(aHexStr)));
//}
//
//void binStrToHexStr(const std::string& aBinStr, std::string& aHexStr) {
//  StringSource ss(aBinStr, true, new HexEncoder(new StringSink(aHexStr)));
//}
//
//void secByteBlockToHexStr(const SecByteBlock& aSecByteBlock, std::string& aHexStr) {
//  aHexStr = std::string((const char*) aSecByteBlock.data(), aSecByteBlock.size());
//}
//
//void hexStrToBinStr(const std::string& aHexStr, std::string& aBinStr) {
//  StringSource ss(aHexStr, true, new HexDecoder(new StringSink(aBinStr)));
//}
//
//// TODO: could make this more efficient (direct to byte vec)
//void hexStrToByteVec(const std::string& aHexStr, std::vector<byte>& aByteVec) {
//  std::string binStr;
//  hexStrToBinStr(aHexStr, binStr);
//
//  aByteVec.resize(binStr.size());
//  std::copy((byte*) &binStr[0], (byte*) &binStr[0] + binStr.size(), &aByteVec[0]);
//}
//
//std::string getCompressedEphemeralPublicKey(AutoSeededRandomPool& rng, const SecByteBlock& ephPk) {
//  // Initialize encryptor with our alg/curve.
//  ECIES<ECC_ALGORITHM>::Encryptor e1;
//  e1.AccessKey().AccessGroupParameters().Initialize(ECC_CURVE);
//  e1.AccessKey().AccessGroupParameters().SetPointCompression(true);
//
//  // Initialize the point on the EC from our ephemeral public key
//  ECC_ALGORITHM::Point point2;
//  e1.GetKey().GetGroupParameters().GetCurve().DecodePoint(point2, ephPk, ephPk.SizeInBytes());
//  e1.AccessKey().SetPublicElement(point2);
//
//  // Check if the initialization is valid
//  e1.AccessKey().ThrowIfInvalid(rng, 3);
//
//  cout << "Uncompressed Ephemeral Public Key Point (04)" << endl << std::hex
//  << "  X: " << point2.x << endl
//  << "  Y: " << point2.y << std::dec << std::endl;
//
//  // Get the ephemeral public key in compressed binary format
//  std::string compEphPubKey;
//  e1.GetPublicKey().Save(StringSink(compEphPubKey).Ref());
//  printBinAsHex("compEphPubKey", compEphPubKey);
//
//  // Now apply DER encoding to get the key's private info
//  ByteQueue kbq;
//  e1.GetKey().DEREncodePublicKey(kbq);
//  std::string compEphPubKeyDer;
//  StringSink kss(compEphPubKeyDer);
//  kbq.CopyTo(kss);
//  kss.MessageEnd();
//
//  printBinAsHex("compEphPubKeyDer", compEphPubKeyDer);
//
//  return compEphPubKeyDer;
//}
//
//std::string getUnCompressedEphemeralPublicKey(AutoSeededRandomPool& rng, const std::string ephPk) {
//  // Initialize encryptor with our alg/curve.
//  ECIES<ECC_ALGORITHM>::Encryptor e1;
//  e1.AccessKey().AccessGroupParameters().Initialize(ECC_CURVE);
//  e1.AccessKey().AccessGroupParameters().SetPointCompression(false);
//
//  // Initialize the point on the EC from our ephemeral public key
//  ECC_ALGORITHM::Point point2;
//  e1.GetKey().GetGroupParameters().GetCurve().DecodePoint(point2, (byte*)&ephPk[0], ephPk.size());
//  e1.AccessKey().SetPublicElement(point2);
//
//  // Check if the initialization is valid
//  e1.AccessKey().ThrowIfInvalid(rng, 3);
//
//  cout << "Uncompressed Ephemeral Public Key Point (04)" << endl << std::hex
//  << "  X: " << point2.x << endl
//  << "  Y: " << point2.y << std::dec << std::endl;
//
//  // Get the ephemeral public key in compressed binary format
//  std::string uncompEphPubKey;
//  e1.GetPublicKey().Save(StringSink(uncompEphPubKey).Ref());
//  printBinAsHex("uncompEphPubKey", uncompEphPubKey);
//
//  // Now apply DER encoding to get the key's private info
//  ByteQueue kbq;
//  e1.GetKey().DEREncodePublicKey(kbq);
//  std::string uncompEphPubKeyDer;
//  StringSink kss(uncompEphPubKeyDer);
//  kbq.CopyTo(kss);
//  kss.MessageEnd();
//
//  printBinAsHex("uncompEphPubKeyDer", uncompEphPubKeyDer);
//
//  return uncompEphPubKeyDer;
//}
