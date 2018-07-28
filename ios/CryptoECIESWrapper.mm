//
//  CryptoECIESWrapper.mm
//  stealthy
//
//  Created by aycarrei on 6/26/18.
//  Copyright © 2018 Stealthy Labs. All rights reserved.
//
#import "CryptoECIESWrapper.h"

#include "CryptoECIES.hpp"

@interface CryptoECIESWrapper ()
@end

@implementation CryptoECIESWrapper

- (NSDictionary *)EncryptECIES:(NSString *)publicKey content:(NSString *)content
{
  CipherObject co = CryptoECIES::EncryptECIES([publicKey cStringUsingEncoding:NSUTF8StringEncoding], [content cStringUsingEncoding:NSUTF8StringEncoding]);
  
  NSDictionary* cipherDict = [[NSMutableDictionary alloc] init];
  [cipherDict setValue:[NSString stringWithUTF8String:co.cipherText.c_str()] forKey:@"cipherText"];
  [cipherDict setValue:[NSString stringWithUTF8String:co.ephemeralPK.c_str()] forKey:@"ephemeralPK"];
  [cipherDict setValue:[NSString stringWithUTF8String:co.iv.c_str()] forKey:@"iv"];
  [cipherDict setValue:[NSString stringWithUTF8String:co.mac.c_str()] forKey:@"mac"];
  
  return cipherDict;
}

- (NSString *)DecryptECIES:(NSString *)privateKey cipherObject:(NSDictionary *)cipherObject
{
//  NSMutableDictionary* mCipherObject = [NSMutableDictionary dictionaryWithDictionary:cipherObject];
//  NSMutableDictionary* mCipherObject = [cipherObject mutableCopy];
  NSMutableDictionary* mCipherObject = [NSMutableDictionary  dictionary];
  [mCipherObject addEntriesFromDictionary:cipherObject];
  
  
  CipherObject co;
  co.cipherText = [[mCipherObject objectForKey:@"cipherText"] cStringUsingEncoding:NSUTF8StringEncoding];
  co.ephemeralPK = [[mCipherObject objectForKey:@"ephemeralPK"] cStringUsingEncoding:NSUTF8StringEncoding];
  co.iv = [[mCipherObject objectForKey:@"iv"] cStringUsingEncoding:NSUTF8StringEncoding];
  co.mac = [[mCipherObject objectForKey:@"mac"] cStringUsingEncoding:NSUTF8StringEncoding];
  
  std::string recovered;
  
  try {
    recovered = CryptoECIES::DecryptECIES([privateKey cStringUsingEncoding:NSUTF8StringEncoding], co);
  } catch (const std::exception& e) {
    NSString * errMsg = [NSString stringWithCString:e.what() encoding:[NSString defaultCStringEncoding]];
    NSException * exception = [NSException exceptionWithName:@"Exception" reason:errMsg userInfo:nil];
    @throw exception;
  } catch (...) {
    NSException * exception = [NSException exceptionWithName:@"Exception" reason:@"unknown error occured" userInfo:nil];
    @throw exception;
  }
  
  NSString* result = [[NSString alloc] initWithUTF8String:recovered.c_str()];
  return result;
}

@end
