const ap = new APlayer({ container: document.getElementById('aplayer') });
const sessionStorageKey = `how_audios_${new Date().toJSON().slice(0, 10)}`
let voiceList = {}
async function fetchVoiceList() {
    if (sessionStorage[sessionStorageKey]) {
        voiceList = JSON.parse(sessionStorage[sessionStorageKey])
    }
    else {
        let resFolder = await fetch('https://api.github.com/repos/EarlySpringCommitee/HowHow-web/contents/assets/audios?ref=master').then(x => x.json())
        resFolder = resFolder.filter(x => x.type == 'dir')
        for (let folder of resFolder) {
            let res = await fetch(`https://api.github.com/repos/EarlySpringCommitee/HowHow-web/contents/assets/audios/${folder.name}?ref=master`).then(x => x.json())
            for (let audio of res) {
                let { name } = audio
                voiceList[name.replace('.mp3', '')] = `/assets/audios/${folder.name}/` + name
            }
        }
        sessionStorage[sessionStorageKey] = JSON.stringify(voiceList)
    }
    $("#play").removeAttr("disabled")
    $("#play").val("播放")
}
async function chinses2Pinyin(text) {
    async function getZhcResult(api) {
        return (await fetch(api, {
            method: 'POST',
            body: JSON.stringify({
                converter: "Pinyin",
                text
            }),
            headers: new Headers({
                'Content-Type': 'application/json'
            })
        }).then(x => x.json())).data.text.split(' ')
    }
    try {
        return (await getZhcResult("https://zhc.gnehs.workers.dev/?https://api.zhconvert.org/convert"))
    } catch (e) {
        console.warn(`無法存取 gnehs API`)
    }
    try {
        return (await getZhcResult("https://zhc.rextw.com/convert"))
    } catch (e) {
        console.warn(`無法存取雷雷 API`)
    }
    try {
        return (await getZhcResult("https://cors-anywhere.herokuapp.com/https://api.zhconvert.org/convert"))
    } catch (e) {
        console.warn(`無法存取 cors-anywhere`)
    }
    try {
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
    } catch (e) {
        console.warn(`無法存取 helloacm 拼音轉換`)
    }
    alert("很抱歉，HowHow 語音發聲器目前無法提供服務，請稍後再試")
}
async function speak(text) {
    gtag('event', 'speak', {
        'event_category': 'speak',
        'event_label': text,
        'value': text
    });
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
            gtag('event', '沒有這個音', {
                'event_category': '沒有這個音',
                'event_label': s,
                'value': s
            });
            ap.list.add([{
                name: s,
                url: voiceList['沒有這個音']
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
    if (text)
        $("#how-text").val(text)
});
fetchVoiceList()
