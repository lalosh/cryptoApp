let drop_handler,dragover_handler,dragend_handler;

$(document).ready(function(){
  
    /*drag and drop file*/
  
    drop_handler=function (ev) {
  
      ev.preventDefault();
  
      let filesArray = [];
      var dt = ev.dataTransfer;
  
      // Use DataTransferItemList interface to access the file(s)
      if (dt.items)
        for (var i=0; i < dt.items.length; i++)
          if (dt.items[i].kind == "file") {
  
            var file = dt.items[i].getAsFile();
  
            let reader = new FileReader();
            reader.readAsText(file);
  
            setTimeout(function () {
            
            if(!(cryptoApp.allMsg[cryptoApp.currentSelectedUser]))
            cryptoApp.allMsg[cryptoApp.currentSelectedUser] = [];
            
            cryptoApp.allMsg[cryptoApp.currentSelectedUser].push({msg: reader.result, state:'out'});
    
            cryptoAPI_AES.exportKey()
            .then(function(sessionKey){
      
              cryptoAPI_AES.encrypt(stringToArrayBuffer(reader.result))
              .then(function(cipherObject){

                let cipherText = cipherObject.cipherText;
                let iv = cipherObject.iv;
      
                cryptoApp.allMsgEnc[cryptoApp.currentSelectedUser].push({msg: arrayBufferToString(cipherText),state:'out'})
      
                let target_RSA = new cryptoAPI('RSA');

                target_RSA.importKey(cryptoApp.allPeople[cryptoApp.currentSelectedUser].publicKeyED)
                .then(function(publicKey){

                  target_RSA.encrypt(sessionKey)
                  .then(function(sessionKey_cipherRSA){

                    target_RSA.encrypt(cipherText)
                    .then(function(cipherText_cipherRSA){

                      target_RSA.encrypt(iv)
                      .then(function(iv_cipherRSA){
      
                        digSigAPI_SV.sign(stringToArrayBuffer(reader.result))
                        .then(function(theSingature){
      
                          socket.emit('sendMsgTo',
                          cryptoApp.username,
                          cryptoApp.currentSelectedUser,
                          cipherText_cipherRSA,
                          iv_cipherRSA,
                          sessionKey_cipherRSA,
                          theSingature
                          );
      
                        })
                      })
                    })
                  })
                })
              })
            })
          },2000);
            
 
            filesArray.push(file);
    }
  
  }
  
    dragover_handler=function (ev) {
  
      // Prevent default select and drag behavior
      ev.preventDefault();
    }
  
    dragend_handler = function dragend_handler(ev) {
  
      // Remove all of the drag data
      var dt = ev.dataTransfer;
  
      if (dt.items)
        // Use DataTransferItemList interface to remove the drag data
        for (var i = 0; i < dt.items.length; i++) {
          dt.items.remove(i);
        }
  
      else
        // Use DataTransfer interface to remove the drag data
        ev.dataTransfer.clearData();
    }
    /*drag and drop file*/
  });