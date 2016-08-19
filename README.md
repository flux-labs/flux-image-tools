This app allows you to upload images to flux data keys, and to browse data keys and view them as images.

https://flux-image-tools.herokuapp.com/

Hopefully images will be supported soon on Flux. Until then you can use this hack to view them. Just right click the raw view and inspect, then paste in this script.

```
$0.style.display = 'none'
var data = $0.textContent;
var img = document.createElement('img');
img.src = data;
$0.parentElement.appendChild(img);
```