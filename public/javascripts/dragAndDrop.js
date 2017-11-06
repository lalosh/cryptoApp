console.log('hello from drag and drop script');
var enc = new TextDecoder();

function drop_handler(ev) {

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
          //io send file //io recv file is the same
          cryptoApp.publicMsg.push({msg:reader.result, state:'out'});
          cryptoApp.publicMsgEnc.push({msg:fakeEnc(reader.result), state:'out'});

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

  // socket.emit('sendFiles',filesArray);
}

function dragover_handler(ev) {

  // console.log("dragOver");
  // Prevent default select and drag behavior
  ev.preventDefault();
}

function dragend_handler(ev) {

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
