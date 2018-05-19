//
//  BlockstackNativeModule.m
//  Stealthy
//
//  Created by Prabhaav Bhardwaj on 5/9/18.
//  Copyright © 2018 Facebook. All rights reserved.
//

#import "BlockstackNativeModule.h"
@import Blockstack;

@implementation BlockstackNativeModule

RCT_EXPORT_MODULE();

//
//
// Bridging Standard Blockstack Methods
////////////////////////////////////////////////////////////////////////////

RCT_EXPORT_METHOD(signIn:(NSString *)redirectURI appDomain:(NSString *)appDomain manifestURI:(NSString *)manifestURI completion:(RCTResponseSenderBlock)completion)
{
  [[Blockstack sharedInstance] signInRedirectURI:redirectURI appDomain:[[NSURL alloc] initWithString:appDomain] manifestURI:nil completion:^(UserDataObject * userData, NSError * error, BOOL cancelled) {
    NSString *profileName = userData.profile.name;
    NSMutableDictionary *userDataDictionary = [NSMutableDictionary new];
    if (profileName != nil) {
      userDataDictionary[@"profileName"] = profileName;
    }
    //TODO: add other user attributes to the dictionary passed to javascript
    completion(@[error ? error.localizedDescription : [NSNull null], userDataDictionary]);
  }];
}

RCT_EXPORT_METHOD(signOut) {
  [[Blockstack sharedInstance] signOut];
}

RCT_EXPORT_METHOD(getUserData:(RCTResponseSenderBlock)completion) {
  NSDictionary* udoDict = nil;
  NSError* error = nil;
  UserDataObject* udo = [[Blockstack sharedInstance] loadUserDataObject];
  
  if (udo == nil) {
    error = [NSError errorWithDomain:@"im.stealthy.www" code:0 userInfo:@{@"no user data": @"Unable to fetch user data"}];
  } else if (udo.username == nil || udo.privateKey == nil || udo.profileURL == nil) {
    error = [NSError errorWithDomain:@"im.stealthy.www" code:0 userInfo:@{@"user data is undefined": @"username, privatekey, and/or profileURL are not defined."}];
  } else {
    udoDict =  @{ @"username" : udo.username,
                  @"privateKey" : udo.privateKey,
                  @"profileURL" : udo.profileURL };
  }
  
  completion(@[error ? error.localizedDescription : [NSNull null],
               udoDict ? udoDict : [NSNull null]]);
}

RCT_EXPORT_METHOD(putFile:(NSString *)path content:(NSDictionary *)content completion:(RCTResponseSenderBlock)completion) {
  [[Blockstack sharedInstance] putFileWithPath:path content:content completion:^(NSString * response, NSError * error) {
    completion(@[error ? error.localizedDescription : [NSNull null]]);
  }];
}

RCT_EXPORT_METHOD(getFile:(NSString *)path completion:(RCTResponseSenderBlock)completion) {
  [[Blockstack sharedInstance] getFileWithPath:path completion:^(id content, NSError * error) {
    completion(@[error ? error.localizedDescription : [NSNull null], content]);
  }];
}

//
//
// Bridging Proposed Blockstack Methods
////////////////////////////////////////////////////////////////////////////

// TODO:
//RCT_EXPORT_METHOD(getFile:(NSString *)path completion:(RCTResponseSenderBlock)completion) {
//  [[Blockstack sharedInstance] getFileWithPath:path completion:^(id content, NSError * error) {
//    completion(@[error ? error.localizedDescription : [NSNull null], content]);
//  }];
//}
//
//RCT_REMAP_METHOD(decryptPrivateKey,
//                 decryptBs:(NSString *)aKey
//                 hexedEncrypted:(NSString *)hexedEncrypted
//                 resolver:(RCTPromiseResolveBlock)resolve
//                 rejecter:(RCTPromiseRejectBlock)reject )
//{
//  NSString* decryptedStr =
//  [[Blockstack sharedInstance] decryptBsWithAKey:aKey hexedEncrypted:hexedEncrypted];
//
//  if (decryptedStr == nil) {
//    NSError *error = [NSError errorWithDomain:@"im.stealthy.www" code:0 userInfo:@{@"encryption failed": @"encrytpion result was nil"}];
//    reject(@"encryption failed", @"encrytpion result was nil", error);
//  } else {
//    resolve(decryptedStr);
//  }
//}
//
//RCT_REMAP_METHOD(encryptZiez,
//                 encryptBs:(NSString *)aKey
//                 hexedNotEncrypted:(NSString *)hexedNotEncrypted
//                 resolver:(RCTPromiseResolveBlock)resolve
//                 rejecter:(RCTPromiseRejectBlock)reject )
//{
//  NSString* encryptedStr =
//  [[Blockstack sharedInstance] encryptBsWithAKey:aKey hexedNotEncrypted:hexedNotEncrypted];
//
//  if (encryptedStr == nil) {
//    NSError *error = [NSError errorWithDomain:@"im.stealthy.www" code:0 userInfo:@{@"encryption failed": @"encrytpion result was nil"}];
//    reject(@"encryption failed", @"encrytpion result was nil", error);
//  } else {
//    resolve(encryptedStr);
//  }
//}

//
//
// Bridging Stealthy Blockstack Methods
////////////////////////////////////////////////////////////////////////////

RCT_EXPORT_METHOD(getPublicKeyFromPrivate:(NSString *) aPrivateKey completion:(RCTResponseSenderBlock)completion) {
  NSString* publicKey = [[Blockstack sharedInstance] getPublicKeyFromPrivateWithAPrivateKey:aPrivateKey];
  NSError *error = nil;
  
  if (!publicKey) {
    error = [NSError errorWithDomain:@"im.stealthy.www"
                     code:0
                     userInfo:@{@"failed to get public key": @"Unable to get public key from private key"}];
  }
  
  completion(@[error ? error.localizedDescription : [NSNull null],
               publicKey ? publicKey : [NSNull null]]);
}

RCT_EXPORT_METHOD(getRawFile:(NSString *)path completion:(RCTResponseSenderBlock)completion) {
  [[Blockstack sharedInstance] getRawFileWithPath:path completion:^(id content, NSError * error) {
    NSData* myData = content;
    NSString* contentStr = [[NSString alloc] initWithData:myData encoding:NSUTF8StringEncoding];
    completion(@[error ? error.localizedDescription : [NSNull null], contentStr]);
  }];
}

@end
