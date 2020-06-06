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
                    if (_voiceList[sp]) {
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