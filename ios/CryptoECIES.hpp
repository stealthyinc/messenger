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
};

class CryptoECIES {
  public:
    static CipherObject EncryptECIES(const std::string& publicKey, const std::string& content);
    static std::string DecryptECIES(const std::string& privateKey, const CipherObject& cipherObject);
};

#endif /* CryptoECIES_hpp */
