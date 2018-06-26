//
//  CryptoECIES.hpp
//  stealthy
//
//  Created by aycarrei on 6/26/18.
//  Copyright © 2018 Facebook. All rights reserved.
//

#ifndef CryptoECIES_hpp
#define CryptoECIES_hpp

#include <stdio.h>
#include <string>

// All strings are hex encoded values
struct CipherObject {
  std::string cipherText;
  std::string ephemeralPK;
  std::string iv;
  std::string mac;
  bool wasString;
};

CipherObject EncryptECIES(const std::string& publicKey, const std::string& content);

void EncryptECIESWrapper(const std::string& publicKey,
                         const std::string& content,
                         std::string& cipherText,
                         std::string& ephemeralPK,
                         std::string& iv,
                         std::string& mac,
                         bool& wasString);

std::string DecryptECIES(const std::string& privateKey, const std::string& cipherObject);

std::string DecryptECIESWrapper(const std::string& privateKey,
                         const std::string& cipherText,
                         const std::string& ephemeralPK,
                         const std::string& iv,
                         const std::string& mac,
                         const bool wasString);


#endif /* CryptoECIES_hpp */
