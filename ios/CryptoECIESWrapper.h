//
//  CryptoECIESWrapper.h
//  stealthy
//
//  Created by aycarrei on 6/26/18.
//  Copyright © 2018 Facebook. All rights reserved.
//

#ifndef CryptoECIESWrapper_h
#define CryptoECIESWrapper_h

#import <Foundation/Foundation.h>

@interface CryptoECIESWrapper : NSObject
@end

@interface CryptoECIESWrapper ()
- (NSDictionary *)EncryptECIES:(NSString *)publicKey content:(NSString *)content;
- (NSString *)DecryptECIES:(NSString *)privateKey cipherObject:(NSDictionary *)cipherObject;
@end
  
#endif /* CryptoECIESWrapper_h */
