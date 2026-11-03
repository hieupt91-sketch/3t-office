# Fixture media lặp do PowerPoint tạo

- Tạo lại: `python scripts/fixtures/make_pptx_media_loop.py` trên Windows có PowerPoint; WAV được sinh tại chỗ bằng Python. Nếu `ffmpeg` có trong PATH, script cũng sinh video màu 2 giây.
- PowerPoint: phiên bản COM `16.0`. Tệp được lưu rồi mở lại bằng PowerPoint COM để đọc các thuộc tính phát.
- Kết quả media: BLOCKED for video (ffmpeg unavailable); audio fixture PASS. PPTX: 54759 byte. Tệp phương tiện trong gói: `ppt/media/media1.wav`.
- Slide 1: âm thanh tự phát, `LoopUntilStopped=True`, `HideWhileNotPlaying=True`.
- Slide 2: video phát khi bấm và lặp lại (nếu có video); âm thanh bắt đầu tự động với `StopAfterSlides=2`, tiếp tục qua slide 3.

Đọc lại từ PowerPoint COM:
```json
{
  "version": "16.0",
  "slides": 3,
  "media": [
    {
      "slide": 1,
      "name": "tone-2s",
      "playOnEntry": -1,
      "loopUntilStopped": -1,
      "hideWhileNotPlaying": -1,
      "stopAfterSlides": 0,
      "mediaType": 0
    },
    {
      "slide": 2,
      "name": "tone-2s",
      "playOnEntry": -1,
      "loopUntilStopped": 0,
      "hideWhileNotPlaying": 0,
      "stopAfterSlides": 2,
      "mediaType": 0
    }
  ]
}
```

Đoạn XML timing/relationships trích từ PPTX:
```xml
<!-- ppt/slides/slide1.xml | p:timing -->
<p:timing><p:tnLst><p:par><p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot"><p:childTnLst><p:seq concurrent="1" nextAc="seek"><p:cTn id="2" dur="indefinite" nodeType="mainSeq"><p:childTnLst><p:par><p:cTn id="3" fill="hold"><p:stCondLst><p:cond delay="indefinite"/></p:stCondLst><p:childTnLst><p:par><p:cTn id="4" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst><p:par><p:cTn id="5" presetID="1" presetClass="mediacall" presetSubtype="0" fill="hold" nodeType="clickEffect"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst><p:cmd type="call" cmd="playFrom(0.0)"><p:cBhvr><p:cTn id="6" dur="1" fill="hold"/><p:tgtEl><p:spTgt spid="3"/></p:tgtEl></p:cBhvr></p:cmd></p:childTnLst></p:cTn></p:par></p:childTnLst></p:cTn></p:par></p:childTnLst></p:cTn></p:par></p:childTnLst></p:cTn><p:prevCondLst><p:cond evt="onPrev" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:prevCondLst><p:nextCondLst><p:cond evt="onNext" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:nextCondLst></p:seq><p:audio><p:cMediaNode vol="80000" showWhenStopped="0"><p:cTn id="7" repeatCount="indefinite" fill="hold" display="0"><p:stCondLst><p:cond delay="indefinite"/></p:stCondLst><p:endCondLst><p:cond evt="onStopAudio" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:endCondLst></p:cTn><p:tgtEl><p:spTgt spid="3"/></p:tgtEl></p:cMediaNode></p:audio></p:childTnLst></p:cTn></p:par></p:tnLst></p:timing>
<!-- ppt/slides/slide1.xml | p14:media -->
<p14:media xmlns:p14="http://schemas.microsoft.com/office/powerpoint/2010/main" r:embed="rId1"/>
<!-- ppt/slides/slide1.xml | a:audioFile -->
<a:audioFile r:link="rId2"/>
<!-- ppt/slides/slide2.xml | p:timing -->
<p:timing><p:tnLst><p:par><p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot"><p:childTnLst><p:seq concurrent="1" nextAc="seek"><p:cTn id="2" dur="indefinite" nodeType="mainSeq"><p:childTnLst><p:par><p:cTn id="3" fill="hold"><p:stCondLst><p:cond delay="indefinite"/></p:stCondLst><p:childTnLst><p:par><p:cTn id="4" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst><p:par><p:cTn id="5" presetID="1" presetClass="mediacall" presetSubtype="0" fill="hold" nodeType="clickEffect"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst><p:cmd type="call" cmd="playFrom(0.0)"><p:cBhvr><p:cTn id="6" dur="2000" fill="hold"/><p:tgtEl><p:spTgt spid="3"/></p:tgtEl></p:cBhvr></p:cmd></p:childTnLst></p:cTn></p:par></p:childTnLst></p:cTn></p:par></p:childTnLst></p:cTn></p:par></p:childTnLst></p:cTn><p:prevCondLst><p:cond evt="onPrev" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:prevCondLst><p:nextCondLst><p:cond evt="onNext" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:nextCondLst></p:seq><p:audio><p:cMediaNode vol="80000" numSld="2"><p:cTn id="7" fill="hold" display="0"><p:stCondLst><p:cond delay="indefinite"/></p:stCondLst><p:endCondLst><p:cond evt="onStopAudio" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:endCondLst></p:cTn><p:tgtEl><p:spTgt spid="3"/></p:tgtEl></p:cMediaNode></p:audio></p:childTnLst></p:cTn></p:par></p:tnLst></p:timing>
<!-- ppt/slides/slide2.xml | p14:media -->
<p14:media xmlns:p14="http://schemas.microsoft.com/office/powerpoint/2010/main" r:embed="rId1"/>
<!-- ppt/slides/slide2.xml | a:audioFile -->
<a:audioFile r:link="rId2"/>
<!-- ppt/slides/_rels/slide1.xml.rels -->
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout7.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/audio" Target="../media/media1.wav"/><Relationship Id="rId1" Type="http://schemas.microsoft.com/office/2007/relationships/media" Target="../media/media1.wav"/><Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image1.png"/></Relationships>
<!-- ppt/slides/_rels/slide2.xml.rels -->
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout7.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/audio" Target="../media/media1.wav"/><Relationship Id="rId1" Type="http://schemas.microsoft.com/office/2007/relationships/media" Target="../media/media1.wav"/><Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image1.png"/></Relationships>
```
