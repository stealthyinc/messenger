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

//RCT_EXPORT_METHOD(putFileOC:(NSString *)path content:(NSDictionary *)content completion:(RCTResponseSenderBlock)completion) {
//  [[Blockstack sharedInstance] putFileWithPath:path content:content completion:^(NSString * response, NSError * error) {
//    completion(@[error ? error.localizedDescription : [NSNull null]]);
//  }];
//}
//
//RCT_EXPORT_METHOD(getFileOC:(NSString *)path completion:(RCTResponseSenderBlock)completion) {
//  [[Blockstack sharedInstance] getFileWithPath:path completion:^(id content, NSError * error) {
//    completion(@[error ? error.localizedDescription : [NSNull null], content]);
//  }];
//}

RCT_EXPORT_METHOD(signOut) {
  [[Blockstack sharedInstance] signOut];
}

// We're using the following function too from BlockstackInstance+ObjC.swift
//    @objc public func loadUserDataObject() -> UserDataObject? {
//
// RCT_EXPORT_METHOD doesn't support functions that return values so use promise resolver as
// a workaround: https://stackoverflow.com/questions/29771622/react-native-how-to-export-a-method-with-a-return-value
//
// Three-argument reject from: https://stackoverflow.com/questions/45099173/react-nativerct-remap-method-how-to-export-a-method-with-a-parameter-and-ret
// NSError code from: https://eezytutorials.com/ios/nserror-by-example.php
//
RCT_REMAP_METHOD(getUserData,
                 resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject )
{
  UserDataObject* udo = [[Blockstack sharedInstance] loadUserDataObject];
  if (udo == nil) {
    NSError *error = [NSError errorWithDomain:@"im.stealthy.www" code:0 userInfo:@{@"no user data": @"Unable to fetch user data"}];
    reject(@"no user data", @"Unable to fetch user data", error);
  } else if (udo.username == nil || udo.privateKey == nil || udo.profileURL == nil) {
    NSError *error = [NSError errorWithDomain:@"im.stealthy.www" code:0 userInfo:@{@"user data is undefined": @"username, privatekey, and/or profileURL are not defined."}];
    reject(@"user data is undefined", @"username, privatekey, and/or profileURL are not defined.", error);
  } else {
    NSDictionary* udoDict =  @{ @"username" : udo.username,
                                @"privateKey" : udo.privateKey,
                                @"profileURL" : udo.profileURL };
    resolve(udoDict);
  }
}

@end

