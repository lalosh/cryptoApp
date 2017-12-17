let socket = io();

////////////////////////////////////////////////////////////

socket.on('sendMsgTo',function(fromUsername, cipherText_cipherRSA, iv_cipherRSA, sessionKey_cipherRSA, theSingature){
  
  if(!(cryptoApp.allMsg[fromUsername])) 
    cryptoApp.allMsg[fromUsername] = [];
  
  if(!(cryptoApp.allMsgEnc[fromUsername])) 
    cryptoApp.allMsgEnc[fromUsername] = [];

  //may cause a problem later
  cryptoApp.currentSelectedUser = fromUsername;


  cryptoAPI_RSA.decrypt(cipherText_cipherRSA)
  .then(function(cipherText){

    cryptoAPI_RSA.decrypt(iv_cipherRSA)
    .then(function(iv){

      cryptoAPI_RSA.decrypt(sessionKey_cipherRSA)
      .then(function(sessionKey){

        cryptoApp.allMsgEnc[fromUsername].push({msg:arrayBufferToString(cipherText), state:'in'});

        let tmp_cryptoAES = new cryptoAPI('AES');

        tmp_cryptoAES.importKey(sessionKey)
        .then(function(_sessionKey){

          let view = new Uint8Array(iv);

          tmp_cryptoAES.decrypt(cipherText, view)
          .then(function(originalMsg){
            
            let tmp_digSig = new digSigAPI();

            tmp_digSig.importKey(cryptoApp.allPeople[fromUsername].publicKeySV)
            .then(function(publicKeyForDG){

              tmp_digSig.verify(theSingature,originalMsg)
              .then(function(resultBoolean){

                cryptoApp.allMsg[fromUsername].push({msg:arrayBufferToString(originalMsg), state:'in'});
                cryptoApp.allMsg[fromUsername].push({msg:('verify state: '+resultBoolean), state:'inv'});
                
              })
            })
          })
        })
      })
    })
  })

});

/////////////////////////////////////////////////////////////

socket.on('newUsername',function(username, publicKeyED_buffer, publicKeySV_buffer, certAsPemText){
   
  addOnlinePerson(username, publicKeyED_buffer, publicKeySV_buffer, certAsPemText);
});

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
    <a id="my-cert" download="certificate.pem">My Certificate</a>

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
          .then(function(_keyPair){
            
            cryptoApp.publicKeySV = _keyPair.publicKey;
            cryptoApp.privateKeySV = _keyPair.privateKey;

            //send public key of DS
            digSigAPI_SV.exportKey()
            .then(function(publicKeySV_buffer){
              
              // commonName, _organization, _organizationUnit, _countryCode
              digSigAPI_SV.createCertificate(cryptoApp.username, cryptoApp.username+"_ORG", cryptoApp.username+"_ORG_UNIT", "EN", _keyPair)
              .then(function(certInfo){

                cryptoApp.certAsPemText = certInfo.certAsPemText;

                let cert_url = "data:application/octet-stream;charset=UTF-8;base64," + btoa(cryptoApp.certAsPemText); 
                document.getElementById('my-cert').setAttribute('href',cert_url);

                socket.emit('sendPersonalInfo',
                              cryptoApp.username,
                              publicKeyED_buffer,
                              publicKeySV_buffer,
                              certInfo.certAsPemText
                            );
                
              })
            })
          })
        })
      })
      
    }
  }

});


Vue.component('people',{

  props:['peopleArray'],

  template:`
  <div class="people">

      <div class="person" v-for="i in peopleArray" :key="i.id">
          <h3>{{i.name}}</h3>
          <a id="people-cert" download="cert.pem" v-bind:href=i.cert> certificate </a>
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
        <input type="text" placeholder="type you message here" @keyup.enter="sendMsg" :value="value" @input="$emit('input',$event.target.value)">
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
    <strong>Drag one or more text files to this Drop Zone ...</strong>
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
    
    certAsPemText: '',

    //session key by AES
    sessionKey: '',

    //current selected user to send msg to
    currentSelectedUser: '',

    //only for names+certs
    peopleArray:[
    ],
    
    //to store personal infos
    allPeople:{
    },

    username:'',

    currentMsgArray:[
      {msg:'choose one of the online users on the left',state:'out'}
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
      
      if(!(cryptoApp.allMsg[cryptoApp.currentSelectedUser]))
        cryptoApp.allMsg[cryptoApp.currentSelectedUser] = [];

      cryptoApp.allMsg[cryptoApp.currentSelectedUser].push({msg: this.realTimeMsg, state:'out'});

      //encrypt and add to allMsgEnc
      let theMsg = this.realTimeMsg;

      cryptoAPI_AES.exportKey()
      .then(function(sessionKey){


        cryptoAPI_AES.encrypt(stringToArrayBuffer(theMsg))
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

                  digSigAPI_SV.sign(stringToArrayBuffer(theMsg))
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

////////////////////////////////////////////////////////////

function addOnlinePerson(personName, publicKeyED_buffer, publicKeySV_buffer, _certAsPemText){

  let newId = cryptoApp.peopleArray.length;

  let cert_url = "data:application/octet-stream;charset=UTF-8;base64," + btoa(_certAsPemText);

  let newPerson = {
    id: newId,
    name: personName,
    cert: cert_url
  };

  cryptoApp.peopleArray.push(newPerson);

  //add personal info and keys
  cryptoApp.allPeople[personName] = {
    publicKeyED: publicKeyED_buffer,
    publicKeySV: publicKeySV_buffer,
    certAsPemText: _certAsPemText,
  };

}

////////////////////////////////////////////////////////

$(document).ready(function(){

  //change current selected user
  $('.people').click(function(event){

    cryptoApp.currentSelectedUser = $(event.target).text();

    $('.person').css('background-color','transparent');
    $('.person h3').css('background-color','transparent');
    $('.person a').css('background-color','transparent');
    
    if($(event.target)[0].nodeName == 'DIV')
      $($(event.target)[0]).css('background-color','crimson');
    else
      $($(event.target).parent()[0]).css('background-color','crimson');
    

    if(!(cryptoApp.allMsg[cryptoApp.currentSelectedUser])) 
      cryptoApp.allMsg[cryptoApp.currentSelectedUser]=[];

    if(!(cryptoApp.allMsgEnc[cryptoApp.currentSelectedUser])) 
      cryptoApp.allMsgEnc[cryptoApp.currentSelectedUser]=[];
    
    cryptoApp.currentMsgArray = cryptoApp.allMsg[cryptoApp.currentSelectedUser];
    cryptoApp.currentMsgArrayEnc = cryptoApp.allMsgEnc[cryptoApp.currentSelectedUser];
  
  })

})