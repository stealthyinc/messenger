package com.stealthy.sdk

import android.util.Base64
import android.util.Log
import android.widget.Toast
import com.facebook.react.bridge.*
import org.blockstack.android.sdk.*
import java.net.URI

import android.preference.PreferenceManager

class BlockstackNativeModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "BlockstackNativeModule"

    override fun getConstants(): MutableMap<String, Any> {
        val constants = HashMap<String, Any>()
        return constants;
    }

    private lateinit var session: BlockstackSession

    // Expose whether or not we need to create a new session (suspect creating sessions when un-needed
    // is causing reload to fail)
    @ReactMethod
    fun hasSession(promise: Promise) {
        var hasValidSession = false
        try {
            hasValidSession = canUseBlockstack()
        } catch ( t: Throwable ) {
            // Suppress ite from lateinit on session decl above
            hasValidSession = false
        }
        promise.resolve(hasValidSession)
    }

    @ReactMethod
    fun createSession(configArg: ReadableMap, promise: Promise) {
        val activity = getReactApplicationContext().currentActivity
        if (activity != null) {
            val scopes = configArg.getArray("scopes")
                    .toArrayList().map { Scope.valueOf((it as String)
                            .split("_").joinToString("") { it.capitalize() }) }
                    .toTypedArray()

            if (!configArg.hasKey("appDomain")) {
                throw IllegalArgumentException("'appDomain' needed in config object")
            }
            val appDomain = configArg.getString("appDomain")
            val manifestUrl = if (configArg.hasKey("manifestUrl")) {
                configArg.getString("manifestUrl")
            } else {
                "$appDomain/manifest.json"
            }

            val redirectUrl = if(configArg.hasKey("redirectUrl")) {
                configArg.getString("redirectUrl")
            } else {
                "$appDomain/redirect"
            }

            // val config = BlockstackConfig(URI(appDomain), redirectUrl, manifestUrl, scopes)
            //
            // @Friedger rolled this for us on Slack and mentioned it works, so skipping all the fun above
            // and commenting out the config def'n above:
            val config = "https://www.stealthy.im"
                           .toBlockstackConfig(
                                   redirectPath = "/redirectAndroid/index.html",
                                   scopes = kotlin.arrayOf(org.blockstack.android.sdk.Scope.StoreWrite,
                                                           org.blockstack.android.sdk.Scope.PublishData))

            activity.runOnUiThread {
                Log.d("BlockstackNativeModule", "create session")
                session = BlockstackSession(activity, config)
                currentSession = session
                Log.d("BlockstackNativeModule", "created session")
                val map = Arguments.createMap()
                map.putBoolean("loaded", true)
                promise.resolve(map)
            }
        } else {
            promise.reject(IllegalStateException("must be called from an Activity that implements ConfigProvider"))
        }
    }

    @ReactMethod
    fun signIn(promise: Promise) {
        if (session.loaded) {
            BlockstackNativeModule.currentSignInPromise = promise
            getReactApplicationContext().currentActivity!!.runOnUiThread {
                session.redirectUserToSignIn {
                    // Error callback
                    Log.d("BlockstackNativeModule", "redirectUserToSignIn has failed ...")
                }
            }
        }
    }

    @ReactMethod
    fun signUserOut(promise: Promise) {
        if (session.loaded) {
           getReactApplicationContext().currentActivity!!.runOnUiThread {
               session.signUserOut()
               val map = Arguments.createMap()
               map.putBoolean("signedOut", true)
               promise.resolve(map)
           }
        }
    }

    @ReactMethod
    fun getPublicKeyFromPrivateKey(aPrivateKey: String, promise: Promise) {
        if (canUseBlockstack()) {
            reactApplicationContext.currentActivity!!.runOnUiThread {
                session.getPublicKeyFromPrivateKey(aPrivateKey) { plainContentResult ->
                    if (plainContentResult.hasValue) {
                        val plainContent:String = plainContentResult.value as String
                        promise.resolve(plainContent)
                    } else {
                        promise.reject("0", plainContentResult.error)
                    }
                }
            }
        }
    }

    @ReactMethod
    fun encryptContent(publicKey: String, content: String, promise: Promise) {
        if (canUseBlockstack()) {
            reactApplicationContext.currentActivity!!.runOnUiThread {
                val options = CryptoOptions(publicKey = publicKey)
                val cipherResult = session.encryptContent(content,options)
                if (cipherResult.hasValue) {
                    val cipher = cipherResult.value!!
                    promise.resolve(cipher.json.toString())
                } else {
                    promise.reject("0", cipherResult.error)
                }
            }
        }
    }

    @ReactMethod
    fun decryptContent(privateKey: String, cipherObjectStr: String, promise: Promise) {
        if (canUseBlockstack()) {
            reactApplicationContext.currentActivity!!.runOnUiThread {
                // The next var is needed due to an API change Blockstack added described as:
                //   @binary flag indicating whether a ByteArray or String was encrypted
                //
                val binary = false
                val options = CryptoOptions(privateKey = privateKey)
                try {
                    val plainContentResult = session.decryptContent(cipherObjectStr, binary, options)
                    if (plainContentResult.hasValue) {
                        val plainContent: String = plainContentResult.value as String
                        promise.resolve(plainContent)
                    } else {
                        promise.reject("0", plainContentResult.error)
                    }
                } catch (t: Throwable) {
                    // Suppress decryption throw (use case: trying to decrypt content
                    // that may or may not be the user's).
                    promise.reject("0", t.message)
                }
            }
        }
    }

    @ReactMethod
    fun putFile(path: String, content:String, optionsArg:ReadableMap, promise: Promise) {
        if (canUseBlockstack()) {
            reactApplicationContext.currentActivity!!.runOnUiThread {
                val options = PutFileOptions(optionsArg.getBoolean("encrypt"))
                session.putFile(path, content, options) {
                    if (it.hasValue) {
                        val map = Arguments.createMap()
                        map.putString("fileUrl", it.value)
                        promise.resolve(map)
                    } else {
                        promise.reject("0", it.error)
                    }
                }
            }
        }
    }

    @ReactMethod
    fun getFile(path: String, optionsArg: ReadableMap, promise: Promise) {
        if (canUseBlockstack()) {
            reactApplicationContext.currentActivity!!.runOnUiThread {
                val options = GetFileOptions(decrypt = optionsArg.getBoolean("decrypt"),
                                             username = optionsArg.getString("username"),
                                             app = optionsArg.getString("app"),
                                             zoneFileLookupURL = java.net.URL(optionsArg.getString("zoneFileLookupURL")))
                session.getFile(path, options) {
                    if (it.hasValue) {
                        val map = Arguments.createMap()
                        if (it.value is String) {
                            map.putString("fileContents", it.value as String)
                        } else {
                            map.putString("fileContentsEncoded", Base64.encodeToString(it.value as ByteArray, Base64.NO_WRAP))
                        }
                        promise.resolve(map)
                    } else {
                        promise.reject("0", it.error)
                    }
                }
            }
        }
    }

    private fun canUseBlockstack() = session.loaded && reactApplicationContext.currentActivity != null

    companion object {
        // TODO only store transitKey and the likes in this static variable
        var currentSession: BlockstackSession? = null
        var currentSignInPromise: Promise? = null
    }
}
