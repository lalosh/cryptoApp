let drop_handler,dragover_handler,dragend_handler;


$(document).ready(function(){
  
  
    console.log('jQuery is running...');
  
    /*drag and drop file*/
    // console.log('hello from drag and drop script');
    // var enc = new TextDecoder();
  
    drop_handler=function (ev) {
  
      // console.log("Drop");
      ev.preventDefault();
  
      let filesArray = [];
      var dt = ev.dataTransfer;
  
      // Use DataTransferItemList interface to access the file(s)
      if (dt.items)
        for (var i=0; i < dt.items.length; i++)
          if (dt.items[i].kind == "file") {
  
            var f = dt.items[i].getAsFile();
  
            /**/
  
            let reader = new FileReader();
            reader.readAsText(f);
  
            setTimeout(function () {
  
              // console.log(reader.result);
              // console.log(typeof reader.result);
  
              //io send file //io recv file is the same
              cryptoApp.publicMsg.push({msg:reader.result, state:'out'});
  
  
              // console.log(typeof reader.result);
              let symCryptoInstance = new symCrypto();
              symCryptoInstance.changePassword(cryptoApp.secretKey);
              let res = symCryptoInstance.encrypt(reader.result);
  
              cryptoApp.publicMsgEnc.push({msg:res, state:'out'});
              //send io the 'res'
              socket.emit('sendMsg',res, cryptoApp.username);
            }, 1000);
  
            /**/
            filesArray.push(f);
            // console.log(" file[" + i + "].name = " + f.name);
            }
  
      // Use DataTransfer interface to access the file(s)
       else
            for (var i=0; i < dt.files.length; i++) {
              // console.log(" file[" + i + "].name = " + dt.files[i].name);
            }
  
    }
  
    dragover_handler=function (ev) {
  
      // console.log("dragOver");
      // Prevent default select and drag behavior
      ev.preventDefault();
    }
  
    dragend_handler = function dragend_handler(ev) {
  
      // console.log("dragEnd");
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
  
  