const ap = new APlayer({ container: document.getElementById('aplayer') });
let voiceBaseURL = "/assets/audios/"
let voiceList = {}
let failVoice = voiceBaseURL + '沒有這個音.mp3'
async function fetchVoiceList() {
    if (sessionStorage['audio']) {
        voiceList = JSON.parse(sessionStorage['audio'])
    }
    else {
        let resFolder = await fetch('https://api.github.com/repos/EarlySpringCommitee/HowHow-web/contents/assets/audios?ref=master').then(x => x.json())
        resFolder = resFolder.filter(x => x.type == 'dir')
        for (let folder of resFolder) {
            let res = await fetch(`https://api.github.com/repos/EarlySpringCommitee/HowHow-web/contents/assets/audios/${folder.name}?ref=master`).then(x => x.json())
            for (let audio of res) {
                let { name } = audio
                voiceList[name.replace('.mp3', '')] = voiceBaseURL + name
            }
        }
        sessionStorage['audio'] = JSON.stringify(voiceList)
    }
    $("#play").removeAttr("disabled")

}
async function chinses2Pinyin(text) {
    // 繁化姬
    /*return (await fetch("https://api.zhconvert.org/convert", {
         method: 'POST',
         body: JSON.stringify({
             converter: "Pinyin",
             text
         }),
         headers: new Headers({
             'Content-Type': 'application/json'
         })
     }).then(x => x.json())).data.text.split(' ')*/
    // 路邊撿的
    let helloacm = (await fetch(`https://helloacm.com/api/pinyin/?cached&s=${text}&t=1`).then(x => x.json())).result

    return helloacm.map(x => {
        if (x.indexOf(',') > 0) {
            let splitedList = x.split(',')
            for (let sp of splitedList) {
                if (voiceList[sp]) {
                    return sp
                }
            }
            return splitedList[0]
        }
        else return x
    })
}
async function speak(text) {
    window.history.pushState({}, '', `/?text=${text}`);
    let pinyin = await chinses2Pinyin(text)
    ap.list.clear()
    for (let s of pinyin) {
        if (voiceList[s]) {
            ap.list.add([{
                name: s,
                url: voiceList[s]
            }]);
        } else {
            console.warn(`沒有這個音: ${s}`)
            ap.list.add([{
                name: s,
                url: failVoice
            }]);
        }
    }
    ap.play()
}
$("#play").click(function () {
    speak($("#how-text").val())
})
ap.on('ended', function () {
    ap.list.remove(0);
});
$(function () {
    let url = new URL(location.href);
    let text = url.searchParams.get('text');
    if (text.length)
        $("#how-text").val(text)
});
fetchVoiceList()
