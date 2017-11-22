function digSigAPI(){
    
        let digSigKeys = {};
    
        function generateKey(){
            return window.crypto.subtle.generateKey(
                {
                    name: 'RSASSA-PKCS1-v1_5',
                    modulusLength: 2048,
                    publicExponent: new Uint8Array([1, 0, 1]),  // 24 bit representation of 65537
                    hash: {name: "SHA-256"}
                },
                true,   // can extract it later if we want
                ['sign', 'verify']
            )
            .then(function(key){
                digSigKeys = key;
                return key;
            });
    
        }//generateKey
    
        function sign(buffer){
            return window.crypto.subtle.sign(
                {name: 'RSASSA-PKCS1-v1_5'},
                digSigKeys.privateKey,
                buffer
            )
        }
    
        function verify(signature, buffer){
            return window.crypto.subtle.verify(
                {name: 'RSASSA-PKCS1-v1_5'},
                digSigKeys.publicKey,
                signature,
                buffer
            )
        }
    
        function importKey(keyBuffer){
            return window.crypto.subtle.importKey(
                'spki',
                keyBuffer,
                {
                    name: 'RSASSA-PKCS1-v1_5',
                    modulusLength: 2048,
                    publicExponent: new Uint8Array([1, 0, 1]), // 24 bit representation of 65537
                    hash: {
                        name: 'SHA-256'
                    }
                },
                true,
                ['verify']
            )
            .then(function(newKey){
                digSigKeys.publicKey = newKey;
                return newKey;
            })
        }
    
        function exportKey(){
            return window.crypto.subtle.exportKey(
                'spki',
                digSigKeys.publicKey
            )
        }
    
        let publicAPI = {
            generateKey: generateKey,
            sign: sign,
            verify: verify,
            importKey: importKey,
            exportKey: exportKey
        };
    
        return publicAPI;
    }
    