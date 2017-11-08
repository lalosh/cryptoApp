//add swap function to all Arrays from now on..
if(!(Array.prototype.swap)){

	Array.prototype.swap = function (index1, index2){

		if(typeof index1 !== 'number') return;
		if(typeof index2 !== 'number') return;

		let tmp = this[index1];
		this[index1] = this[index2];
		this[index2] = tmp;
	}
}


function cipherArrayToString(cipher){
	return cipher.map(function(e){
		return String.fromCharCode(e);
	}).join("")
}

function stringTocipherArray(string){
	return string.split("").map(function(e){
		return e.charCodeAt();
	})
}


/*
// test


let a = new symCrypto();
a.changePassword('pass2');
let cipher = a.encrypt('how are tou?');

console.log(cipher);

let plainText = a.decrypt((cipher));
console.log((plainText));
*/


function symCrypto(algoName){

  //temp override
  algoName = "RC4";

  if(!(algoName === "RC4" || algoName === "AES"))
    algoName = "AES";

  let publicAPI;

  if(algoName == "RC4") publicAPI = new cryptoRC4();
  if(algoName == "AES") publicAPI = new cryptoAES();

  return publicAPI;
}




function stringToByteArray(text){

	let textInBytes = text
						.split('')
						.map(
							function(input){
								return input.charCodeAt(0)
							});
						// .join('');


	return textInBytes;
}


function cryptoRC4(){


		let secretKey = '';

		let encryptOutput = {
			plainText: '',
			cipherText: '',
		}

		let decryptOutput = {
			plainText: '',
			cipherText: '',
		}

		//identity permutaion
		function identityPermutationON(s, k, keyInBytes){
			for (let i = 0; i < 255; i++) {
				s.push(i);
				k.push(keyInBytes[i%keyInBytes.length])
			}
		}

		//RC4 - Key Scheduling Algorithm (KSA)
		function KSA(s, k){
		    let j = 0;
		    for (let i = 0; i < 255; i++) {
		    	j = (j + s[i] + k[i]) % 256;
		    	s.swap(i, j);
		    }
		}

	    //RC4 - Pseudo-Random Generation Algorithm (PRGA)
		function PRGA(s, keyStream, textInBytes){
		    let i = 0;
		    j = 0;
		    for (let l = 0; l < textInBytes.length; l++) {
		        i = (l+1) % 256;
		        j = (j+s[i]) % 256;
		        s.swap(i, j);
		        keyStream.push( s[ (s[i] + s[j]) % 256 ] );
		    }
		}

	    //generating the cipher text
		function generateCipher(plainText, secretKey){
			let cipher = [];
		    for (let i = 0; i < secretKey.length; i++) {
		        cipher.push( secretKey[i] ^ plainText[i]);
		    }
		    return cipher;
		}

		function encryptRC4(text, key){

			//Entity authentication(checking input)
			if(typeof text !== 'string') return;
			if(typeof key !== 'string') return;

			encryptOutput.plainText = text;

			if(!secretKey)
				secretKey = key;
			else
				if(secretKey !== key) {
					console.log('cannot encrypt:keys are not identical');
					return;
				}

			//convert strings to array of bytes
			let textInBytes = stringToByteArray(text);
			let keyInBytes = stringToByteArray(key);

			let s = [];
			let k = [];

			identityPermutationON(s, k, keyInBytes);
			KSA(s, k);

	    let keyStream = [];
	    PRGA(s, keyStream, textInBytes);

	    let cipher = generateCipher(textInBytes, keyStream);

	    encryptOutput.cipherText = cipher;

		return cipherArrayToString(cipher);

		}

		function decryptRC4(cipherText, key){

			//Entity authentication(checking input)
			if(typeof key !== 'string') return;

			decryptOutput.cipherText = cipherText;

			if(!secretKey)
				secretKey = key;
			else
				if(secretKey != key){
					console.log('cannot decrypt:keys not identical');
					return;
				}

			//convert strings to array of bytes
			let keyInBytes = stringToByteArray(key);

			let s = [];
			let k = [];

			identityPermutationON(s, k, keyInBytes);
			KSA(s, k);

			let keyStream = [];
			PRGA(s, keyStream, cipherText);

			let plainText = generateCipher(cipherText, keyStream);

			plainText = plainText.map(
										function(input){
											return String.fromCharCode(input);
									})
								  .join("");

			decryptOutput.plainText = plainText;

			return plainText;
		}

		function printInfo(){
			console.log('--------info-----------');
			console.log('key =  ', secretKey);
			console.log();

			console.log('encryptOutput:');
			console.log('text = ', encryptOutput.plainText);
			console.log('cipherText = ', encryptOutput.cipherText);

			console.log();

			console.log('decryptOutput');
			console.log('text = ', decryptOutput.plainText);
			console.log('cipherText = ', decryptOutput.cipherText);

			console.log();
		}

		function changePassword(newPassword){
			secretKey = newPassword;
		}

		function getPassword(){
			return secretKey;
		}

		let publicAPI = {
				changePassword: changePassword,
				getPassword: getPassword,
				encrypt: function(text){return encryptRC4(text, secretKey)},
				decrypt: function(cipherText){
					cipherText = stringTocipherArray(cipherText);
					return decryptRC4(cipherText, secretKey)},
			}

		return publicAPI;

}

