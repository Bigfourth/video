# 📺 Xad Player Integration Guide

This guide explains how to embed **outstream** and **instream** ad players (via Google Ad Manager / VAST / VMAP).  

---

## 1. Outstream Player

Outstream shows video ads automatically in your page layout, without requiring original video content.  

### HTML Structure

```html
<script src="https://cdn.jsdelivr.net/gh/Bigfourth/video@latest/xadplayer.js" async></script>
<div class="xad-outstream"
     data-mode="outstream"
     data-adtag="ADUNIT"
     data-sticky="bottom-right"
     data-close="true"
     data-width="400"
     data-height="250">
</div>
```

### Supported Attributes

| Attribute          | Example Value          | Description                                                           |
|--------------------|------------------------|-----------------------------------------------------------------------|
| `data-mode`        | `outstream`            | Player type (outstream here).                                         |
| `data-adtag`       | `ADUNIT`               | GAM ad unit path (e.g. `/1234567/video_outstream`).                   |
| `data-sticky`      | `top-left`<br>`top-right`<br>`bottom-left`<br>`bottom-right` | Sticky corner placement when scrolling.                               |
| `data-close`       | `true` / `false`       | Allow users to close the player.                                      |
| `data-width`       | `400`                  | Player width in pixels.                                               |
| `data-height`      | `250`                  | Player height in pixels.                                              |

### Example

```html
<div class="xad-outstream"
     data-mode="outstream"
     data-adtag="/6355419/Travel/Europe"
     data-sticky="top-left"
     data-close="true"
     data-width="400"
     data-height="250">
</div>
```

---

## 2. Instream Player

Instream plays **pre/mid/post-roll ads** within your video content.  

### HTML Structure

```html
<script src="https://cdn.jsdelivr.net/gh/Bigfourth/video@latest/xadplayer.js" async></script>
<video class="xad-video"
       data-mode="instream"
       data-src="LINK VIDEO"
       data-adtag="ADUNIT"
       data-autoplay="muted"
       data-controls="true"
       playsinline>
</video>
```

### Supported Attributes

| Attribute        | Example Value           | Description                                                           |
|------------------|-------------------------|-----------------------------------------------------------------------|
| `data-mode`      | `instream`              | Player type (instream here).                                          |
| `data-src`       | `LINK VIDEO`            | Video content source (`.mp4`, `.m3u8`, `.mpd`).                       |
| `data-adtag`     | `ADUNIT`                | GAM ad unit path (e.g. `/1234567/video_preroll`).                     |
| `data-autoplay`  | `muted` / `false`       | Autoplay video (muted avoids autoplay blocking).                      |
| `data-controls`  | `true` / `false`        | Show control bar.                                                     |
| `playsinline`    | —                       | Ensures inline playback on iOS.                                       |

### Example

```html
<video class="xad-video"
       data-mode="instream"
       data-src="https://cdn.example.com/movie.m3u8"
       data-adtag="/6355419/Travel/Europe"
       data-autoplay="muted"
       data-controls="true"
       playsinline>
</video>
```

---

## 3. Sticky Placement (`data-sticky`)

For **outstream**, the player can “dock” to one of the 4 screen corners when the user scrolls:  

- `top-left`  
- `top-right`  
- `bottom-left`  
- `bottom-right`  

---

## 4. Demo Ad Tags (Google Samples)

Google provides demo tags for testing VAST/VMAP ads:  

- **VAST preroll**:  
  ```
  https://pubads.g.doubleclick.net/gampad/ads?iu=/6355419/Travel/Europe&description_url=https%3A%2F%2Fdevelopers.google.com&env=vp&gdfp_req=1&output=vast&unviewed_position_start=1&sz=640x480&correlator=
  ```
- **VMAP (pre/mid/post)**:  
  ```
  https://pubads.g.doubleclick.net/gampad/ads?iu=/6355419/Travel/Europe&description_url=https%3A%2F%2Fdevelopers.google.com&env=vp&gdfp_req=1&output=vmap&unviewed_position_start=1&sz=640x480&correlator=
  ```
