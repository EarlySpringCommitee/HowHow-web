const ap = new APlayer({ container: document.getElementById('aplayer') });
const howVideoEl = document.getElementById('how-video');
const audioStorageKey = `how_audios_${new Date().toJSON().slice(0, 10)}`
const vidioStorageKey = `how_vidios_${new Date().toJSON().slice(0, 10)}`
const mimeCodec = "video/mp4; codecs=avc1.64001F, mp4a.40.2";
const branch = location.hostname == 'howfun.futa.gg' ? 'master' : 'dev'
window._voiceList = {}
window._videoList = {}
async function fetchList() {
    if (sessionStorage[audioStorageKey]) {
        _voiceList = JSON.parse(sessionStorage[audioStorageKey])
    }
    else {
        let resFolder = await fetch('https://api.github.com/repos/EarlySpringCommitee/HowHow-web/contents/assets/audios?ref=' + branch).then(x => x.json())
        resFolder = resFolder.filter(x => x.type == 'dir')
        for (let folder of resFolder) {
            let res = await fetch(`https://api.github.com/repos/EarlySpringCommitee/HowHow-web/contents/assets/audios/${folder.name}?ref=${branch}`).then(x => x.json())
            for (let audio of res) {
                let { name } = audio
                _voiceList[name.replace('.mp3', '')] = `/assets/audios/${folder.name}/` + name
            }
        }
        sessionStorage[audioStorageKey] = JSON.stringify(_voiceList)
    }
    if (sessionStorage[vidioStorageKey]) {
        _videoList = JSON.parse(sessionStorage[vidioStorageKey])
    }
    else {
        let resFolder = await fetch('https://api.github.com/repos/EarlySpringCommitee/HowHow-web/contents/assets/videos?ref=' + branch).then(x => x.json())
        resFolder = resFolder.filter(x => x.type == 'dir')
        for (let folder of resFolder) {
            let res = await fetch(`https://api.github.com/repos/EarlySpringCommitee/HowHow-web/contents/assets/videos/${folder.name}?ref=${branch}`).then(x => x.json())
            for (let video of res) {
                let { name } = video
                _videoList[name.replace('.mp4', '')] = `/assets/videos/${folder.name}/${name}`
            }
        }
        sessionStorage[vidioStorageKey] = JSON.stringify(_videoList)
    }
    $("#play,#play-video").removeAttr("disabled")
    $("#play,#play-video").val("播放")
    howVideoEl.src = _videoList['＿＿']
}
async function speak(text) {
    if (text == "") { return alert("請輸入文字") }
    gtag('event', 'speak', {
        'event_category': 'speak',
        'event_label': text,
        'value': text
    });
    window.history.pushState({}, '', `/?text=${text}`);
    let pinyin = await chinses2Pinyin(text)
    ap.list.clear()
    for (let s of pinyin) {
        if (_voiceList[s]) {
            ap.list.add([{
                name: s,
                url: _voiceList[s]
            }]);
        } else {
            console.warn(`沒有這個音: ${s}`)
            gtag('event', '沒有這個音', {
                'event_category': '沒有這個音',
                'event_label': `${s} - ${text}`,
                'value': s
            });
            ap.list.add([{
                name: s,
                url: _voiceList['沒有這個音']
            }]);
        }
    }
    ap.play()
}
window._how_vlist = []
window._how_vlist_active = 0
async function speakVideo(text) {
    if (text == "") { return alert("請輸入文字") }
    gtag('event', 'speak-v', {
        'event_category': 'speak-v',
        'event_label': text,
        'value': text
    });
    window.history.pushState({}, '', `/?text=${text}`);
    let pinyin = await chinses2Pinyin(text)
    _how_vlist = []
    _how_vlist_active = 0
    for (let s of pinyin) {
        let pushVideo = v => {
            if (!'MediaSource' in window) {
                let videoLoader = v => {
                    let headID = document.getElementsByTagName('head')[0];
                    let link = document.createElement('link');
                    link.as = 'video';
                    link.rel = 'preload'
                    link.href = v
                    headID.appendChild(link);
                };
                videoLoader(v)
            }
            _how_vlist.push({
                v,
                played: false
            })
        }
        if (_videoList[s]) {
            pushVideo(_videoList[s])
        } else {
            console.warn(`沒有這個音: ${s}`)
            gtag('event', '沒有這個音', {
                'event_category': '沒有這個音',
                'event_label': `${s} - ${text}`,
                'value': s
            });
            pushVideo(_videoList['沒有這個音'])

        }
    }

    if (!'MediaSource' in window || !MediaSource.isTypeSupported(mimeCodec)) {
        howVideoEl.src = _how_vlist[0].v
        howVideoEl.play();
        howVideoEl.addEventListener('playing', function (e) {
            _how_vlist[_how_vlist_active].played = true
        })
        howVideoEl.addEventListener('ended', function (e) {
            if (_how_vlist[_how_vlist_active] && _how_vlist[_how_vlist_active].played) {
                _how_vlist_active++
                if (_how_vlist.length > _how_vlist_active) {
                    howVideoEl.src = _how_vlist[_how_vlist_active].v;
                    howVideoEl.play();
                }
            }
        });
    } else {
        (async () => {
            const mediaSource = new MediaSource();
            const video = howVideoEl
            const urls = JSON.parse(JSON.stringify(_how_vlist)).map(x => x.v)
            const request = url => fetch(url).then(response => response.arrayBuffer())
            const files = await Promise.all(urls.map(request));
            const media = await Promise.all(files.map(file => {
                return new Promise(resolve => {
                    let media = document.createElement("video");
                    let blobURL = URL.createObjectURL(new Blob([file]));
                    media.onloadedmetadata = async e => {
                        resolve({
                            mediaDuration: media.duration,
                            mediaBuffer: file
                        })
                    }
                    media.src = blobURL;
                })
            }));
            console.log(media);
            mediaSource.addEventListener("sourceopen", sourceOpen);
            video.src = URL.createObjectURL(mediaSource)
            video.play()
            async function sourceOpen(event) {
                if (MediaSource.isTypeSupported(mimeCodec)) {
                    const sourceBuffer = mediaSource.addSourceBuffer(mimeCodec);
                    for (let chunk of media) {
                        await new Promise(resolve => {
                            sourceBuffer.appendBuffer(chunk.mediaBuffer);
                            sourceBuffer.onupdateend = e => {
                                sourceBuffer.onupdateend = null;
                                sourceBuffer.timestampOffset += chunk.mediaDuration;
                                console.log(mediaSource.duration);
                                resolve()
                            }
                        })
                    }
                    mediaSource.endOfStream();
                }
                else {
                    console.warn(mimeCodec + " not supported");
                }
            };
        })()
    }
}
$("#play").click(function () {
    speak($("#how-text").val())
})
$("#play-video").click(function () {
    speakVideo($("#how-text-video").val())
})
ap.on('ended', function () {
    ap.list.remove(0);
});
$(function () {
    let url = new URL(location.href);
    let text = url.searchParams.get('text');
    if (text) {
        $("#how-text").val(text)
        $("#how-text-video").val(text)
    }
});
fetchList()
