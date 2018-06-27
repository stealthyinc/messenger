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
@property (nonatomic) CryptoECIES cryptoECIES;
@end

@implementation CryptoECIESWrapper

- (NSString *)getHelloString {
  self.cryptoECIES = *(new CryptoECIES);
  std::string str = self.cryptoECIES.getHelloString();
  
  NSString* result = [[NSString alloc] initWithUTF8String:str.c_str()];
  return result;
}
//-(void)encrypt:(NSString*)publicKey content:(NSString*)content {
//  NSLog(@"CryptoECIESWrapper.mm::encrypt:");
//}

@end
