
function cryptoAPI(algoUsed){
    
    let savedKey= {}; //save the secret key OR the key pair object(contains public+private key)

    function generateKey(){
       
        //return one secret key
        if(algoUsed === 'AES')
            return window.crypto.subtle.generateKey(
                {
                    name: 'AES-CBC',
                    length: 128
                },
                true,
                ['encrypt', 'decrypt']
            )
            .then(
                function(secretKey){
                    savedKey = secretKey;
                    return secretKey;
                },function(error){
                    console.log(error);
                })
        
        //return a key pair object that contain both publicKey,privateKey properties
        if(algoUsed === 'RSA')
            return window.crypto.subtle.generateKey(
                {
                    name: 'RSA-OAEP',
                    modulusLength: 2048,
                    publicExponent: new Uint8Array([1, 0, 1]),
                    hash: {name: 'SHA-256'}
                },
                true,
                ['encrypt', 'decrypt']                
            )
            .then(
                function(keyPair){
                    savedKey = keyPair;
                    return keyPair;
                },
                function(error){
                    console.log(error);
                }
            )
        
    }

    //you should have generated the key(s) before exprting any
    function exportKey(){
    //return Array Buffer

        //if you have a key pair only export the public key
        if(algoUsed === 'RSA')
            return window.crypto.subtle.exportKey(
                'spki',
                savedKey.publicKey
            )
        
        if(algoUsed === 'AES')
        //if AES used return the only secret key
            return window.crypto.subtle.exportKey(
                'raw',
                savedKey
            )
    }

    function importKey(key){

        if(algoUsed === 'RSA')
            return window.crypto.subtle.importKey(
                'spki',
                key,
                {
                    name: 'RSA-OAEP',
                    modulusLength: 2048,
                    publicExponent: new Uint8Array([1, 0, 1]), // 24 bit representation of 65537
                    hash: {
                        name: 'SHA-256'
                    }
                },
                true,
                ['encrypt']
            )
            .then(
                function(key){
                    savedKey.publicKey = key;
                    return savedKey;
                },
                function(error){
                    return error;
                }
            )

        if(algoUsed === 'AES')
            return window.crypto.subtle.importKey(
                'raw',
                key,
                {
                    name: 'AES-CBC',
                    length: 128
                },
                true,
                ['encrypt', 'decrypt']
            )
            .then(
                function(key){
                    savedKey = key;
                    return savedKey;
                },
                function(error){
                    return error;
                }
            )
    }

    function encrypt(buffer){

        //RSA
        if(algoUsed === 'RSA')
            return window.crypto.subtle.encrypt(
                {
                    name: 'RSA-OAEP'
                },
                savedKey.publicKey,
                buffer
            )
        
        //AES
        if(algoUsed === 'AES'){

            let initVect = window.crypto.getRandomValues(new Uint8Array(16));
        
            return window.crypto.subtle.encrypt(
                {
                    name: 'AES-CBC',
                    iv: initVect
                },
                savedKey,
                buffer
            )
            .then(function(cipherText){
                    let cipherObject = {
                        cipherText: cipherText,
                        iv: initVect
                    }

                    return cipherObject;
                }
            )
        }//AES
    }

    function decrypt(buffer, initVect){

        
        if(algoUsed === 'AES')
            return window.crypto.subtle.decrypt(
                {
                    name: 'AES-CBC',
                    iv: initVect
                },
                savedKey,
                buffer
            )
        
        if(algoUsed === 'RSA')
            return window.crypto.subtle.decrypt(
                {
                    name: 'RSA-OAEP'
                },
                savedKey.privateKey,
                buffer
            )

    }


    let publicAPI = {
        generateKey: generateKey,
        exportKey: exportKey,
        importKey: importKey,
        encrypt: encrypt,
        decrypt: decrypt,
    };

    return publicAPI;
}