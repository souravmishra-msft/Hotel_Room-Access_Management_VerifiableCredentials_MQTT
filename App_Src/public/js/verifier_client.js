const verify = document.getElementById('verify');

const qrcode = new QRCode("qrcode", { width: 200, height: 200 });
let respPresentationReq = null;

verify.addEventListener('click', () => {
    fetch('/api/verifier/presentation-request')
    .then((response)=> {
        response.text()
        .catch(error => document.getElementById("message").innerHTML = error)
        .then((message) => {
            respPresentationReq = JSON.parse(message);
            if( /Android/i.test(navigator.userAgent) ) {
                console.log(`Android device! Using deep link (${respPresentationReq.url}).`);
                window.location.href = respPresentationReq.url; setTimeout( () => {
                window.location.href = "https://play.google.com/store/apps/details?id=com.azure.authenticator"; }, 2000);
            } else if (/iPhone/i.test(navigator.userAgent)) {
                console.log(`iOS device! Using deep link (${respPresentationReq.url}).`);
                window.location.replace(respPresentationReq.url);
            } else {
                console.log(`Not Android or IOS. Generating QR code encoded with ${message}`);
                // localStorage.setItem("qr-url", JSON.stringify(respPresentationReq.url));
                qrcode.makeCode(respPresentationReq.url);
                document.getElementById('verify').style.visibility = "hidden";
                document.getElementById('qrText').style.display = "block";
            }
        }).catch(error => { console.log(error.message); })
    }).catch(error => { console.log(error.message); })
    let checkStatus = setInterval(() => {
        fetch('api/verifier/presentation-response?id=' + respPresentationReq.id )
            .then(response => response.text())
            .catch(error => document.getElementById("message").innerHTML = error)
            .then(response => {
                if (response.length > 0) {
                    console.log(response)
                    respMsg = JSON.parse(response);
                    // QR Code scanned
                    if (respMsg.status == 'request_retrieved') {
                        document.getElementById('message-wrapper').style.display = "block";
                        document.getElementById('status-icon').innerHTML = `<img src="/images/qr-code-scan.gif" width="200" height="200" >`;
                        document.getElementById('qrText').style.display = "none";
                        document.getElementById('qrcode').style.display = "none";
                        document.getElementById('message').innerHTML = respMsg.message;
                    }
                    
                    if (respMsg.status == 'presentation_verified') {
                        // localStorage.setItem("payload", JSON.stringify(respMsg.payload));
                        console.log(`Payload: ${JSON.stringify(respMsg.payload)}`);
                        document.getElementById('message').innerHTML = respMsg.message;
                        document.getElementById('status-icon').innerHTML = `<img src="/images/tick.gif" width="200" height="200" >`;
                        // document.getElementById('payload').innerHTML = "Payload: " + JSON.stringify(respMsg.payload);
                        document.getElementById('subject').innerHTML = `Hello, ${respMsg.firstName} ${respMsg.lastName}. Your access is verified successfully.`;
                        document.getElementById('btn-set').innerHTML = `<button id="back-home-btn" class="button" onclick="location.href='/'"><i class="fas fa-home"></i> Home</button>
                                                                        <button id="check-room-btn" class="button" onclick="location.href='/roomDetails.html'">Check Room <i class="fas fa-angle-double-right"></i></button>`;
                        clearInterval(checkStatus);
                    }
                }
            });
    }, 3000); //change this to higher interval if you use ngrok to prevent overloading the free tier service
});


