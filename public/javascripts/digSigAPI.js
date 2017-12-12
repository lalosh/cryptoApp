
function digSigAPI(){
    'use strict';

    let digSigKeys = {};
    let certInfoObj;

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

    function createCertificate(_commonName, _organization, _organizationUnit, _countryCode, _keyPair) {
        let keyPair = _keyPair;

        let commonName       = _commonName;
        let organization     = _organization;
        let organizationUnit = _organizationUnit;
        let countryCode      = _countryCode;

        if (!commonName) {
            console.log("You must enter a name for the certificate."); 
            return;
        }
        if (countryCode.length !== 2) {
            console.log("Country codes must be two characters long.");
             return;
        }
        countryCode = countryCode.toUpperCase();
       
        let certAsPemText;
        let publicKeyAsPemText;
        let privateKeyAsPemText;

        return buildCertificateObject(commonName, organization, organizationUnit, countryCode, keyPair)
        
        //convert (cert + public key + private key) to base64 string and pem files
        .then(function(cert) {
            
            let pemCert = convertBinaryToPem(cert.toSchema(true).toBER(false), "CERTIFICATE");
            // let pemUrl = "data:application/octet-stream;charset=UTF-8;base64," + btoa(pemCert);
           
            certAsPemText = pemCert;
            
            return window.crypto.subtle.exportKey('spki', keyPair.publicKey).
            then(function(spki) {
                let pemPublicKey = convertBinaryToPem(spki, "PUBLIC KEY");
                // let pemUrl = "data:application/octet-stream;charset=UTF-8;base64," + btoa(pemPublicKey);
                
                publicKeyAsPemText = pemPublicKey;
                
                return window.crypto.subtle.exportKey('pkcs8', keyPair.privateKey).
                then(function(pkcs8) {
                    let pemPrivateKey = convertBinaryToPem(pkcs8, "PRIVATE KEY");
                    // let pemUrl = "data:application/octet-stream;charset=UTF-8;base64," + btoa(pemPrivateKey);
                   
                    privateKeyAsPemText = pemPrivateKey;
                    
                    certInfoObj = {
                        publicKeyAsPemText: publicKeyAsPemText,
                        privateKeyAsPemText: privateKeyAsPemText,
                        certAsPemText: certAsPemText,
                    }
                    return certInfoObj;
                })
            });
        

        })

    }





// Returns a Promise yielding the certificate object
function buildCertificateObject(commonName, organization, organizationUnit, countryCode, keyPair) {
    var cert = new org.pkijs.simpl.CERT();

    setSerialNumber(cert, Date.now());
    setSubject(cert, countryCode, organization, organizationUnit, commonName);
    setIssuer(cert, countryCode, organization, organizationUnit, commonName);
    setValidityPeriod(cert, new Date(), 30);  // Good from today for 30 days
    setEmptyExtensions(cert);
    setCABit(cert, false);
    setKeyUsage(cert, true, true, false, false, false, true, true); // digitalSignature, nonRepudiation, keyCertSign, cRLSign
    setSignatureAlgorithm(cert, "1.2.840.113549.1.1.11"); // RSA with SHA-256

    return setPublicKey(cert, keyPair.publicKey).
        then(function() {return signCert(cert, "1.2.840.113549.1.1.11", keyPair.privateKey)}).
        then(function() {return cert});


    // Helper functions

    function setSerialNumber(cert, serialNumber) {
        cert.serialNumber = new org.pkijs.asn1.INTEGER({value: serialNumber});;
    }

    function setSubject(cert, countryCode, organization, organizationUnit, commonName) {
        setEntity(cert.subject, countryCode, organization, organizationUnit, commonName);
    }

    function setIssuer(cert, countryCode, organization, organizationUnit, commonName) {
        setEntity(cert.issuer, countryCode, organization, organizationUnit, commonName);
    }

    function setEntity(entity, countryCode, organization, organizationUnit, commonName) {
        if (countryCode) {
            entity.types_and_values.push(new org.pkijs.simpl.ATTR_TYPE_AND_VALUE({
                    type: "2.5.4.6", //countryCode
                    value: new org.pkijs.asn1.PRINTABLESTRING({value: countryCode})
            }));
        }

        if (organization) {
            entity.types_and_values.push(new org.pkijs.simpl.ATTR_TYPE_AND_VALUE({
                type: "2.5.4.10", //Organization
                value: new org.pkijs.asn1.PRINTABLESTRING({value: organization})
            }));
        }

        if (organizationUnit) {
            entity.types_and_values.push(new org.pkijs.simpl.ATTR_TYPE_AND_VALUE({
                type: "2.5.4.11", //Organization Unit
                value: new org.pkijs.asn1.PRINTABLESTRING({value: organizationUnit})
            }));
        }

        if (commonName) {
            entity.types_and_values.push(new org.pkijs.simpl.ATTR_TYPE_AND_VALUE({
                type: "2.5.4.3", //commonName
                value: new org.pkijs.asn1.PRINTABLESTRING({value: commonName})
            }));
        }
    }

    function setValidityPeriod(cert, startDate, durationInDays) {
        // Normalize to midnight
        var start = new Date(startDate);
        start.setHours(0);
        start.setMinutes(0);
        start.setSeconds(0);
        var end   = new Date(start.getTime() + durationInDays * 24 * 60 * 60 * 1000);

        cert.notBefore.value = start;
        cert.notAfter.value  = end;
    }

    function setEmptyExtensions(cert) {
        cert.extensions = new Array();
    }

    function setCABit(cert, isCA) {
        var basicConstraints = new org.pkijs.simpl.x509.BasicConstraints({
            cA: isCA,
            pathLenConstraint: 3
        });

        cert.extensions.push(new org.pkijs.simpl.EXTENSION({
            extnID: "2.5.29.19",
            critical: false,
            extnValue: basicConstraints.toSchema().toBER(false),
            parsedValue: basicConstraints
        }));
    }

    function setKeyUsage(cert, digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment, keyAgreement, keyCertSign, cRLSign) {
        var keyUsageBits = new ArrayBuffer(1);
        var keyUsageBytes = new Uint8Array(keyUsageBits);

        keyUsageBytes[0] = 0;
        if (digitalSignature)   {keyUsageBytes[0] |= 0x80;}
        if (nonRepudiation)     {keyUsageBytes[0] |= 0x40;}
        if (keyEncipherment)    {keyUsageBytes[0] |= 0x20;}
        if (dataEncipherment)   {keyUsageBytes[0] |= 0x10;}
        if (keyAgreement)       {keyUsageBytes[0] |= 0x08;}
        if (keyCertSign)        {keyUsageBytes[0] |= 0x04;}
        if (cRLSign)            {keyUsageBytes[0] |= 0x02;}

        var keyUsage = new org.pkijs.asn1.BITSTRING({value_hex: keyUsageBits});
        cert.extensions.push(new org.pkijs.simpl.EXTENSION({
            extnID: "2.5.29.15",
            critical: false,
            extnValue: keyUsage.toBER(false),
            parsedValue: keyUsage
        }));
    }

    function setSignatureAlgorithm(cert, oid) {
        cert.signatureAlgorithm.algorithm_id = oid; // In tbsCert
    }

    function setPublicKey(cert, publicKey) {
        return cert.subjectPublicKeyInfo.importKey(publicKey);
    }

    function signCert(cert, oid, privateKey) {
        cert.signature.algorithm_id = oid; // In actual signature
        return cert.sign(privateKey);
    }
}


// General helper functions

function arrayBufferToBase64String(arrayBuffer) {
    var byteArray = new Uint8Array(arrayBuffer)
    var byteString = '';

    for (var i=0; i<byteArray.byteLength; i++) {
        byteString += String.fromCharCode(byteArray[i]);
    }

    return btoa(byteString);
}


function convertBinaryToPem(binaryData, label) {
    var base64Cert = arrayBufferToBase64String(binaryData);

    var pemCert = "-----BEGIN " + label + "-----\r\n";

    var nextIndex = 0;
    var lineLength;
    while (nextIndex < base64Cert.length) {
        if (nextIndex + 64 <= base64Cert.length) {
            pemCert += base64Cert.substr(nextIndex, 64) + "\r\n";
        } else {
            pemCert += base64Cert.substr(nextIndex) + "\r\n";
        }
        nextIndex += 64;
    }

    pemCert += "-----END " + label + "-----\r\n";
    return pemCert;
}












        
    let publicAPI = {
        generateKey: generateKey,
        sign: sign,
        verify: verify,
        importKey: importKey,
        exportKey: exportKey,
        createCertificate: createCertificate,
    };

    return publicAPI;
}
