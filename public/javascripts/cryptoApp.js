let socket = io();

////////////////////////
socket.on('sendMsgTo',function(fromUsername, cipherText_cipherRSA, iv_cipherRSA, sessionKey_cipherRSA){
  
  if(!(cryptoApp.allMsg[fromUsername])) 
    cryptoApp.allMsg[fromUsername] = [];
  
  if(!(cryptoApp.allMsgEnc[fromUsername])) 
    cryptoApp.allMsgEnc[fromUsername] = [];

  //may cause a problem later
  cryptoApp.currentSelectedUser = fromUsername;


  
  console.log('i ve rececieved')
  console.log(fromUsername)
  console.log(cipherText_cipherRSA)
  console.log(iv_cipherRSA)
  console.log(sessionKey_cipherRSA);
  

  cryptoAPI_RSA.decrypt(cipherText_cipherRSA)
  .then(function(cipherText){
    cryptoAPI_RSA.decrypt(iv_cipherRSA)
    .then(function(iv){
      cryptoAPI_RSA.decrypt(sessionKey_cipherRSA)
      .then(function(sessionKey){

        console.log('rece session key',arrayBufferToString(sessionKey))
        console.log('recv iv',arrayBufferToString(iv));
        console.log('recv ciphertext', arrayBufferToString(cipherText));

        cryptoApp.allMsgEnc[fromUsername].push({msg:arrayBufferToString(cipherText), state:'in'});
        

        let tmp_cryptoAES = new cryptoAPI('AES');
        tmp_cryptoAES.importKey(sessionKey)
        .then(function(_sessionKey){
          
          console.log('**cipher buffer*',cipherText.byteLength)
          console.log('***',iv.byteLength);
          console.log('***',_sessionKey)

          let view = new Uint8Array(iv);
          console.log('view ', view);
          console.log('cipher ', new Uint8Array(cipherText));

          tmp_cryptoAES.decrypt(cipherText, view)
          .then(function(originalMsg){
            
            cryptoApp.allMsg[fromUsername].push({msg:arrayBufferToString(originalMsg), state:'in'});
  
          })

        })


      })
    })
  })


  //decryption //receive a msg
  // cryptoApp.allMsg[fromUsername].push({msg:msgComming, state:'in'});

});

///////////////////////
socket.on('newUsername',function(username, publicKeyED_buffer, publicKeySV_buffer){
    addOnlinePerson(username, publicKeyED_buffer, publicKeySV_buffer);
});
///////////////////////

//////////////////////////////////////////////////////////////

let cryptoAPI_AES = new cryptoAPI('AES');
let cryptoAPI_RSA = new cryptoAPI('RSA');
let digSigAPI_SV = new digSigAPI();


Vue.component('loginForm', {

  props:['username'],

  template:`
  <div v-if="!username" class="loginForm">

      <input type="text" v-on:keyup.enter="changeUserName">
      <button v-on:click="changeUserName">log in</button>

  </div>

  <div class="loginForm" v-else>

    <p>Hello,{{username}}!  </p>

  </div>
  `,

  methods:{
    changeUserName: function(){
      cryptoApp.username = $('.loginForm :input').val();

      //generate the key for AES
      cryptoAPI_AES.generateKey()
      .then(function(sessionKey){
        cryptoApp.sessionKey = sessionKey;
      })

      //generate the keys for RSA and DS  
      cryptoAPI_RSA.generateKey()
      .then(function(keyPair){
        cryptoApp.publicKeyED = keyPair.publicKey;
        cryptoApp.privateKeyED = keyPair.privateKey;

        //send public key of RSA
        cryptoAPI_RSA.exportKey()
        .then(function(publicKeyED_buffer){

          //generate the keys for Digital Signature
          digSigAPI_SV.generateKey()
          .then(function(keyPair){
            
            cryptoApp.publicKeySV = keyPair.publicKey;
            cryptoApp.privateKeySV = keyPair.privateKey;

            //send public key of DS
            digSigAPI_SV.exportKey()
            .then(function(publicKeySV_buffer){
            
              socket.emit('sendPersonalInfo', cryptoApp.username, publicKeyED_buffer,publicKeySV_buffer);
            })

          })
        })
      })
      

      //tests
      setTimeout(() => {
        console.log('generating keys done!')
        // console.log(cryptoApp.sessionKey)
        // console.log(cryptoApp.publicKeyED)
        // console.log(cryptoApp.privateKeyED)
        // console.log(cryptoApp.publicKeySV)
        // console.log(cryptoApp.privateKeySV)    
      }, 1000);

    }
  }

});


Vue.component('people',{

  props:['peopleArray'],

  template:`
  <div class="people">

      <div class="person" v-for="i in peopleArray" :key="i.id">
          <h3>{{i.name}}</h3>
          <span>is typing...</span>
      </div>

  </div>
  `,
})


Vue.component('online',{

    props:['peopleArray','username'],

    template:`
    <aside>
      <loginForm :username='username'></loginForm>
      <people :peopleArray='peopleArray'></people>
    </aside>
    `
})


Vue.component('chatBoxEnc',{

  props:['publicMsgEnc','realTimeEncMsg'],

  template:`
  <div class="chatBox chatBoxEnc">

    <div class="msgArea">

        <span v-for="i in publicMsgEnc" :class="i.state">{{i.msg}}</span>

    </div>

    <div class="inputArea inputAreaEnc">
      <span>{{realTimeEncMsg}}</span>
    </div>

  </div>
  `,

})

Vue.component('chatBox',{

  props:['value','publicMsg'],

  template:`
  <div class="chatBox">

    <div class="msgArea">

        <span v-for="i in publicMsg" :class="i.state">{{i.msg}}</span>

    </div>

    <div class="inputArea">
        <input type="text" @keyup.enter="sendMsg" :value="value" @input="$emit('input',$event.target.value)">
        <button @click="sendMsg">send</button>
    </div>

  </div>
  `,

  methods:{
    sendMsg: function(){
      this.$emit('sendMsg');
    },
  }

})


Vue.component('fileArea',{

  template:`
  <div class="fileArea" id="drop_zone" ondrop="drop_handler(event);" ondragover="dragover_handler(event);" ondragend="dragend_handler(event);">
    <strong>Drag one or more files to this Drop Zone ...</strong>
  </div>
  `
})



var cryptoApp = new Vue({

  el:'#cryptoApp',

  data:{

    encryptedMsgNow: '',
    ivNow:'',

    //public + private key to encrypt / decrypt
    publicKeyED: '',
    privateKeyED: '',
    
    //public + private key to sign / verify    
    publicKeySV: '',
    privateKeySV: '',
    
    //session key by AES
    sessionKey: '',

    //current selected user to send msg to
    currentSelectedUser: '',

    //only for names
    peopleArray:[
    ],
    
    //to store personal infos
    allPeople:{
    },

    username:'',

    currentMsgArray:[
      {msg:'how are you?',state:'out'}
    ],
    currentMsgArrayEnc:[

    ],
    
    //this msgs objects working according to the username
    allMsg:{},
    allMsgEnc:{},

    realTimeMsg:'',

  },

  template:`
  <div id='cryptoApp'>
    <div class="line"></div>
    <online :peopleArray='peopleArray' :username='username'></online>
   
    <div class="col-2-3">
      <chatBox :publicMsg="currentMsgArray" v-model="realTimeMsg" v-on:sendMsg="sendMsg"></chatBox>
      <chatBoxEnc :publicMsgEnc="currentMsgArrayEnc"></chatBoxEnc>
      <fileArea></fileArea>
    </div>
  </div>
  `,


  methods:{
    sendMsg: function(){

      if(!(cryptoApp.currentSelectedUser)) return;

      console.log('send button clicked!!')
      
      if(!(cryptoApp.allMsg[cryptoApp.currentSelectedUser]))
        cryptoApp.allMsg[cryptoApp.currentSelectedUser] = [];

      cryptoApp.allMsg[cryptoApp.currentSelectedUser].push({msg: this.realTimeMsg, state:'out'});
      //encrypt and add to allmsgenc
      /**/
      console.log(typeof this.realTimeMsg);
      console.log(this.realTimeMsg);
      console.log(this.realTimeMsg.length);
      let theMsg = this.realTimeMsg;

      cryptoAPI_AES.exportKey()
      .then(function(sessionKey){

        console.log('sent session key is:', arrayBufferToString(sessionKey));


        cryptoAPI_AES.encrypt(stringToArrayBuffer(theMsg))
        .then(function(cipherObject){
          let cipherText = cipherObject.cipherText;
          let iv = cipherObject.iv;
          
          console.log('sent cipher text', arrayBufferToString(cipherText));
          console.log('sent iv',new Uint8Array(iv));

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

                  socket.emit('sendMsgTo',
                              cryptoApp.username,
                              cryptoApp.currentSelectedUser,
                              cipherText_cipherRSA,
                              iv_cipherRSA,
                              sessionKey_cipherRSA
                            );

                  console.log('sending done,okay relax');
      
                })
              })
            })
          })
        })
      })
      /* */
      //send msg@@@
      //encrypt the msg before sending
      // socket.emit('sendMsgTo',cryptoApp.username, cryptoApp.currentSelectedUser, this.realTimeMsg)


      cryptoApp.realTimeMsg="";

    },//sendMsg
  },


  watch:{
    
    currentMsgArray:function(){
          
    cryptoApp.currentMsgArray = cryptoApp.allMsg[cryptoApp.currentSelectedUser];
    cryptoApp.currentMsgArrayEnc = cryptoApp.allMsgEnc[cryptoApp.currentSelectedUser];
  
    },
    currentMsgArray: function(){

      setTimeout(function () {
        let a = document.querySelectorAll('.msgArea')[0];
        a.scrollTop = a.scrollHeight;

        let b = document.querySelectorAll('.msgArea')[1];
        b.scrollTop = b.scrollHeight;
      }, 0);

    },
    
    currentMsgArrayEnc: function(){

      setTimeout(function () {
        let a = document.querySelectorAll('.msgArea')[0];
        a.scrollTop = a.scrollHeight;

        let b = document.querySelectorAll('.msgArea')[1];
        b.scrollTop = b.scrollHeight;
      }, 0);

    }

  }//watch

})



//io
//////////////////////////
function addOnlinePerson(personName, publicKeyED_buffer, publicKeySV_buffer){

  let newId = cryptoApp.peopleArray.length;

  let newPerson = {
    id: newId,
    name: personName
  };

  cryptoApp.peopleArray.push(newPerson);

  //add personal info and keys
  cryptoApp.allPeople[personName] = {
    publicKeyED: publicKeyED_buffer,
    publicKeySV: publicKeySV_buffer,
  };

}
//////////////////////////////


$(document).ready(function(){

  //change current selected user
  $('.people').click(function(event){

    cryptoApp.currentSelectedUser = $(event.target).text();

    if(!(cryptoApp.allMsg[cryptoApp.currentSelectedUser])) 
      cryptoApp.allMsg[cryptoApp.currentSelectedUser]=[];

    if(!(cryptoApp.allMsgEnc[cryptoApp.currentSelectedUser])) 
      cryptoApp.allMsgEnc[cryptoApp.currentSelectedUser]=[];
    
    cryptoApp.currentMsgArray = cryptoApp.allMsg[cryptoApp.currentSelectedUser];
    cryptoApp.currentMsgArrayEnc = cryptoApp.allMsgEnc[cryptoApp.currentSelectedUser];
  
  })

})