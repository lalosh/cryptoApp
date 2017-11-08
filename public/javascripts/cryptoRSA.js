if (window.crypto && !window.crypto.subtle && window.crypto.webkitSubtle) {
    window.crypto.subtle = window.crypto.webkitSubtle;  // Won't work if subtle already exists
}


if (!window.crypto || !window.crypto.subtle) {
    console.log("Your current browser does not support the Web Cryptography API! This page will not work.");
}


function arrayBuffer2String(buf) {
 
  return String.fromCharCode.apply(null, new Uint16Array(buf));
}


function string2ArrayBuffer(str) {
  
  var buf = new ArrayBuffer(str.length*2); // 2 bytes for each char
  var bufView = new Uint16Array(buf);
  
  for (var i=0, strLen=str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  
  return buf;
}


function cryptoRSA(){

    var keyPair;    // Used by several handlers later

    // Key pair creation:
    function createAndSaveAKeyPair() {
        // Returns a promise.
        // Takes no input, yields no output to then handler.
        // Side effect: updates keyPair in enclosing scope with new value.

        return window.crypto.subtle.generateKey(
            {
                name: "RSA-OAEP",
                modulusLength: 2048,
                publicExponent: new Uint8Array([1, 0, 1]),  // 24 bit representation of 65537
                hash: {name: "SHA-256"}
            },
            true,   // can extract it later if we want
            ["encrypt", "decrypt"]
        )
        .then(function (key) {
            keyPair = key;
            return key;
        });
    }

    // createAndSaveAKeyPair().
    // then(function(keyPairResult) {
    //     keyPair = keyPairResult;    

    //     //or include code inside the next two timeout here (nested!)
    // })
    // .catch(function(err) {
    //     console.log("Could not create a keyPair " + err.message);
    // });


    function encryptText_RSA(myInputText, publicKey) {

        return processTheText();

        function processTheText() {

            var plaintext = myInputText;

            return encrypt(plaintext, publicKey)
            .then(function(a) {

                console.log('encrypt finish!');
                return a;
            })
            .catch(function(err) {
                console.log("Something went wrong encrypting: " + err.message + "\n" + err.stack);
            });



                function encrypt(plaintext, publicKey) {

                    var sessionKey, encryptedText, encryptedKey;  // Used in two steps, so saved here for passing

                    //generate session key via AES
                    return window.crypto.subtle.generateKey(
                        {name: "AES-CBC", length: 128},
                        true,
                        ["encrypt", "decrypt"]).
                    then(saveSessionKey).       // Will be needed later for exportSessionKey
                    then(encryptPlaintext).
                    then(saveEncryptedText).        // Will be needed later for packageResults
                    then(exportSessionKey).
                    then(encryptSessionKey).
                    then(packageResults)
                    .then(function(encryptResultObject){

                        return encryptResultObject;

                    });


                    // The handlers for each then clause:

                    function saveSessionKey(key) {
                        // Returns the same key that it is provided as its input.
                        // Side effect: updates sessionKey in the enclosing scope.
                        sessionKey = key;
                        return sessionKey;
                    }

                    //encrypt plaintext using AES
                    function encryptPlaintext(sessionKey) {
                        // Returns a Promise that yields an array [iv, ciphertext]
                        // that is the result of AES-CBC encrypting the plaintext
                        // from the enclosing scope with the sessionKey provided
                        // as input.
                        //
                        // Both the iv (initialization vector) and ciphertext are
                        // of type Uint8Array.
                        var iv = window.crypto.getRandomValues(new Uint8Array(16));


                        return window.crypto.subtle.encrypt({name: "AES-CBC", iv: iv}, sessionKey, string2ArrayBuffer(plaintext)).
                        then(function(ciphertext) {
                            //ciphertext is arraybuffer

                            return [iv, new Uint8Array(ciphertext)];
                        });
                    }

                    //encrypted in AES
                    function saveEncryptedText(ivAndCiphertext) {
                        // Returns nothing. Side effect: updates encryptedText in the enclosing scope.
                        encryptedText = ivAndCiphertext;
                    }

                    function exportSessionKey() {
                        // Returns a Promise that yields an ArrayBuffer export of
                        // the sessionKey found in the enclosing scope.
                        return window.crypto.subtle.exportKey('raw', sessionKey);
                    }

                    //encrypt session key with RSA
                    function encryptSessionKey(exportedKey) {
                        // Returns a Promise that yields an ArrayBuffer containing
                        // the encryption of the exportedKey provided as a parameter,
                        // using the publicKey found in an enclosing scope.

                        return window.crypto.subtle.encrypt({name: "RSA-OAEP"}, publicKey, exportedKey);
                    }

                    function packageResults(encryptedKey2) {

                        encryptedKey = encryptedKey2;

                        let encryptResultObject = {
                            cipherText: encryptedText[1],
                            cipherTextIV: encryptedText[0],
                            encryptedKey: encryptedKey,
                        };

                        return encryptResultObject;
                    }


            } // End of encrypt
        } // end of processTheText

    } // end of encryptText_RSA click handler


    function decryptText_RSA(encryptResultObject, privateKey) {
        // Click handler. Reads the selected file, then decrypts it to
        // the random key pair's private key. Creates a bolb_resultCipher with the result,
        // and places a link to that bolb_resultCipher in the download-results section.

        return processTheText(encryptResultObject, privateKey);

        function processTheText(encryptResultObject, privateKey) {


            var encryptedKey    = encryptResultObject.encryptedKey;
            var iv              = encryptResultObject.cipherTextIV;
            var ciphertext      = encryptResultObject.cipherText;

            return  decrypt(ciphertext, iv, encryptedKey, privateKey)
                    .then(function(plaintext) {
                        return plaintext;
                    
                    })
                    .catch(function(err) {
                        console.log("Something went wrong decrypting: " + err.message + "\n" + err.stack);
                    });


            function decrypt(ciphertext, iv, encryptedSessionKey, privateKey) {
                // Returns a Promise the yields a bolb_resultCipher containing the decrypted ciphertext.

                return  decryptKey(encryptedSessionKey, privateKey)
                        .then(importSessionKey)
                        .then(decryptCiphertext);

                //decrypt session key by using private key via RSA
                function decryptKey(encryptedKey, privateKey) {
                    // Returns a Promise that yields a Uint8Array AES key.
                    // encryptedKey is a Uint8Array, privateKey is the privateKey
                    // property of a Key key pair.

                    return window.crypto.subtle.decrypt({name: "RSA-OAEP"}, privateKey, encryptedKey);
                }


                function importSessionKey(keyBytes) {
                    // Returns a Promise yielding an AES-CBC Key from the
                    // Uint8Array of bytes it is given.

                    return window.crypto.subtle.importKey(
                        "raw",
                       keyBytes,
                        {name: "AES-CBC", length: 128},
                        true,
                        ["encrypt", "decrypt"]
                    );
                }

                function decryptCiphertext(sessionKey) {
                    // Returns a Promise yielding a bolb_resultCipher containing the decryption of ciphertext
                    // (from an enclosing scope) using the sessionKey and the iv
                    // (initialization vector, from an enclosing scope).
                  
                    return window.crypto.subtle.decrypt({name: "AES-CBC", iv: iv}, sessionKey, ciphertext).
                    
                    then(function(plaintext) {
                        
                        return plaintext;
                    });
                }



            } // end of decrypt
        } // end of processTheText
    } // end of decryptText_RSA


    let publicAPI = {
        createKeyPair: createAndSaveAKeyPair,
        getPrivateKey: function(){return keyPair.privateKey},
        getPublicKey: function(){return keyPair.publicKey},
        encrypt: encryptText_RSA,
        decrypt: decryptText_RSA,
    };

    return publicAPI;
}//cryptoRSA
