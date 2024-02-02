import { DigitalAsset } from "./digital_asset.js";

//constants
// change base url depending on whether the page url includes 'local
const baseUrl = 'https://book.soona.co';

const colors = {
  transparent: null,
  pink: '#f2a1fd',
  blue: '#4b66ff',
  black: '#000000',
  brown: '#301a00',
  green: '#1d8c33',
  orange: '#f0562e',
  red: '#f03742',
  grey: '#989ca3',
  yellow: '#f9e061',
  white: '#ffffff',
};
const maxLongestSide = 1280;
const requestedImages = {};

// reactive objects
const accountId = {
  value: null,
  set(value) {
    this.value = value;
    this.valueListener(value);
  },
  get() {
    return this.value;
  },
  valueListener(value) {},
  addValueListener: function (listener) {
    this.valueListener = listener;
  },
};

accountId.addValueListener(value => {
  if (!value) return;
  else {
    navigationProcess();
  }
});


// variables
let fileFields = [null, null, null],
  readers = [null, null, null],
  imgEls = [null, null, null],
  originalImage = new Image(),
  authToken = null,
  digitalAsset = null,
  selectedColor = null,
  selectedButton = null,
  imgSrcs = [null, null, null],
  loadingSpinners = [null, null, null],
  currentTab = 0;

// functions
function debounce(func, timeout = 300){
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => { func.apply(this, args); }, timeout);
  };
}

function resize(image, maxLongestSide){
  var canvas = document.createElement('canvas');
  let width = image.width;
  let height = image.height;
  if (width > height) {
      if (width > maxLongestSide) {
          height *= maxLongestSide / width;
          width = maxLongestSide;
      }
  } else {
      if (height > maxLongestSide) {
          width *= maxLongestSide / height;
          height = maxLongestSide;
      }
  }
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d').drawImage(image, 0, 0, width, height);
  return canvas.toDataURL('image/jpg');
}

function rgbComponentToHex(c) {
  var hex = c.toString(16);
  return hex.length == 1 ? "0" + hex : hex;
}

function rgbToHex(r, g, b) {
  return "#" + rgbComponentToHex(r) + rgbComponentToHex(g) + rgbComponentToHex(b);
}

function rgbStringToHex(rgbString) {
  let rgbArray = rgbString.split('(')[1].split(')')[0].split(',');
  let r = parseInt(rgbArray[0]);
  let g = parseInt(rgbArray[1]);
  let b = parseInt(rgbArray[2]);
  return rgbToHex(r, g, b);
}

function dataURLtoFile(dataurl, filename) {
  var arr = dataurl.split(','),
      mime = arr[0].match(/:(.*?);/)[1],
      bstr = atob(arr[arr.length - 1]), 
      n = bstr.length, 
      u8arr = new Uint8Array(n);
  while(n--){
      u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, {type:mime});
}

function setColorFromURL() {
  let splitURL = window.location.href.split('/');
  let colorName = splitURL[splitURL.length - 1];
  colorName = colorName.split('-')[0];
  selectedColor = colors[colorName] ? colors[colorName] : colors.transparent;
}

async function navigationProcess() {
  if(!authToken || authToken === 'null' || authToken === 'undefined') return;
  removeHideClass(loadingSpinners[currentTab]);
  await createDigitalAsset();
  addHideClass(loadingSpinners[currentTab]);
  window.location.href = createMediaEditorPath();
}

async function createDigitalAsset() {
  return new Promise(async (resolve, reject) => {
    if (!fileFields[currentTab].files[0]){
      resolve();
      return;
    }
    let src = imgSrcs[currentTab] ? imgSrcs[currentTab] : imgEls[currentTab].src;
    const file = dataURLtoFile(src, fileFields[currentTab].files[0].name);
    digitalAsset = new DigitalAsset(file);
    await digitalAsset.create(accountId.get(), authToken, 'production');
    resolve();
  }
  );
}

function createMediaEditorPath() {
  if (digitalAsset?.digitalAsset?.id) {
  return `${baseUrl}/#/account/${digitalAsset.accountId}/asset/${digitalAsset.digitalAsset.id}?album=account`;
  } else {
    return `${baseUrl}/#/account/${accountId.get()}`;
  }
}

function setRequestHeaders(request) {
  request.setRequestHeader("Accept", "application/json");
  request.setRequestHeader("Content-Type", "application/json");
  request.setRequestHeader("Access-Control-Allow-Origin", "*")
  return request;
}

function getColorClassName(element) {
  return Array.from(element.classList).find(className => className.includes('is-'))?.split('-')[1];
}

function staticColorClickHandler(colorButton) {
  let colorName = getColorClassName(colorButton);
  if (!colorName) return;
  selectedColor = colors[colorName];
  if (originalImage.src) {
    removeHideClass(loadingSpinners[currentTab]);
    requestCVImage(originalImage.src).then((result) => {
      if (result) {
        imgEls[currentTab].src = result;
        imgEls[currentTab].srcset = result;
      }
      addHideClass(loadingSpinners[currentTab]);
      if (selectedButton) removeHighlighted(selectedButton);
      selectedButton = colorButton;
      addHighlighted(colorButton);
    });
  }
  return;
}

function addStyleListener(htmlElement) {
  var observer = new MutationObserver(debounce((mutations) => {
    mutations.forEach(function(mutationRecord) {
        let selectedColorRGB = mutationRecord.target.style.backgroundColor;
        selectedColor = rgbStringToHex(selectedColorRGB);
        if (originalImage.src) {
          removeHideClass(loadingSpinners[currentTab]);
          requestCVImage(originalImage.src).then((result) => {
            if (result) {
              imgEls[currentTab].src = result;
              imgEls[currentTab].srcset = result;
            }
            addHideClass(loadingSpinners[currentTab]);
            if (selectedButton){
              removeHighlighted(selectedButton);
              selectedButton = null;
            }
          });
        }
    });    
  }), 1000);

  observer.observe(htmlElement, { attributes : true, attributeFilter : ['style'] });
}

function parseColorButtons(colorButtons, element) {
  let colorButtonsArray = Array.from(colorButtons);
  colorButtonsArray.forEach(colorButton => {
    if (colorButton.classList.contains('is-color-picker')) {
      let colorSwatch = element.getElementsByClassName('ms-color-swatch')[0];
      addStyleListener(colorSwatch);
    } else {
      colorButton.addEventListener('click', () => {
        let colorName = getColorClassName(colorButton);
        linkClicked('toolbar', `${colorName} button`, null);
        staticColorClickHandler(colorButton)
      });
    }
  });
}

function resetVariables() {
  originalImage = new Image();
  selectedColor = null;
  selectedButton = null;
}
  
// requests
async function requestCVImage (base64File) {
  if (!base64File) return;
  if (requestedImages[base64File + selectedColor]) return requestedImages[base64File + selectedColor];
  if (selectedColor === colors.transparent) return await requestMaskedImage(base64File);
  else return await requestBackgroundChange(base64File, selectedColor);
}

async function requestBackgroundChange (base64File, backgroundColor) {
  let processedBase64File = base64File.split(',')[0].indexOf('base64') >= 0 ? base64File.split(',')[1] : btoa(unescape(base64File.split(',')[1]));
  let imageRequest = {
    input: [
        {
            "asset_id": "assets/cool-dog.jpg",
            "image_base64": processedBase64File,
            "mode": "color_shift",
            "hex_color": backgroundColor,
        },
    ],
  }; 
  const resp = await AwsWafIntegration.fetch('https://cv-pub.ml.soona.co/v1/media-editor/background/replace',
            {
                method: 'POST',
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                },
                body: JSON.stringify(imageRequest)
            }).then((response) => {
              if (response.status !== 200) {
                return;
              }
              return response;
            }).catch((error) => {
              console.log(error);
            });
  if (!resp) return;
  var result = await resp.json();
  result = `data:image/jpg;base64,${result['assets'][0]['image_base64']}`;
  requestedImages[base64File + selectedColor] = result;
  return result;
}

async function requestMaskedImage (base64File) {
  let processedBase64File = base64File.split(',')[0].indexOf('base64') >= 0 ? base64File.split(',')[1] : btoa(unescape(base64File.split(',')[1]));
  let imageRequest = {
    input: [
      {
        image_base64: processedBase64File
      },
    ]
  }; 
  const resp = await AwsWafIntegration.fetch('https://cv-pub.ml.soona.co/v1/media-editor/background/remove',
            {
                method: 'POST',
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                },
                body: JSON.stringify(imageRequest)
            }).then((response) => {
              if (response.status !== 200) {
                return;
              }
              return response;
            }).catch((error) => {
              console.log(error);
            });
  if (!resp) return;
  var result = await resp.json();
  result = `data:image/jpg;base64,${result['assets'][0]['image_base64']}`;
  requestedImages[base64File + selectedColor] = result;
  return result;
}

function getContextFromUrl() {
  let url = window.location.href;
  let splitUrl = url.split('/');
  let context = splitUrl[splitUrl.length - 1];
  context = context.replace(/[\-_]/g, ' ');
  return context;
}

function linkClicked(subContext, linkLabel, linkHref) {
  try {
    analytics.track('Link Clicked',
    {
      context: getContextFromUrl(),
      subContext: subContext,
      linkLabel: linkLabel,
      linkHref: linkHref,
    });
  } catch (error) {
    console.error(error);
  }
}

function fileUploaded(subContext, fileType, fileSize, fileHeight, fileWidth) {
  try {
    analytics.track('File Uploaded',
    {
      context: getContextFromUrl(),
      subContext: subContext,
      fileType: fileType,
      fileSize: fileSize,
      fileHeight: fileHeight,
      fileWidth: fileWidth,
    });
  } catch (error) {
    console.error(error);
  }
}

// auth portal

function receiveMessage(event) {
  if (event.origin !== baseUrl) return;
  let splitData = event.data.split(',');
  authToken = splitData[1].split(':')[1];
  if (!authToken || authToken === 'null' || authToken === 'undefined') return;
  accountId.set(splitData[0].split(':')[1]);
}

function openAuthPortal() {
  let popupWinWidth = 500;
  let popupWinHeight = 600;
  let left = window.screenX + (window.outerWidth - popupWinWidth) / 2;
  let top = window.screenY + (window.outerHeight - popupWinHeight) / 2;
  let popUpUrl = `${baseUrl}/#/sign-up?isExternalAuthPortal=true&redirect=/sign-in%3FisExternalAuthPortal=true`;
  let newWindow = window.open(popUpUrl,'google window','width='+popupWinWidth+',height='+popupWinHeight+',top='+top+',left='+left);
  newWindow.focus()
  // add event listener to receive message from auth portal
  window.addEventListener('message', receiveMessage, false);
}


// drag and drop image code
const handleDrop = () => {
  return e => {
    const dt = e.dataTransfer;
    const files = dt.files;

    if (files.length > 1) {
      alert('Please upload only one image');
      return;
    }

    if (!['image/jpg', 'image/jpeg', 'image/png'].includes(files[0].type)) {
      alert('Please use a valid image');
      return;
    }

    readers[currentTab].readAsDataURL(files[0]);
  }
};

const preventDefaults = e => {
  e.preventDefault();
  e.stopPropagation();
};

const addHighlight = el => () => el.classList.add('highlight');
const removeHighlight = el => () => el.classList.remove('highlight');
const addHighlighted = el => el.classList.add('highlighted');
const removeHighlighted = el => el.classList.remove('highlighted');
const addHideClass = el => el.classList.add('hide');
const removeHideClass = el => el.classList.remove('hide');
const addIsOpen = el => el.classList.add('is-open');
const removeIsOpen = el => el.classList.remove('is-open');

//setup

function setUpEditingPane(element, index) {
  let imgEl = element.getElementsByClassName('entry-point_display-image')[0];
  imgEls[index] = imgEl;
  imgEl.src = null;
  const dropUploadArea = element.getElementsByClassName('entry-point_file-upload-border')[0];
  const uploadWrapper = element.getElementsByClassName('entry-point_file-upload-content')[0];
  const imgElWrapper = element.getElementsByClassName('entry-point_image-wrap')[0];
  const mainCta = element.getElementsByClassName('entry-point_buttons')[0].children[0];
  const colorButtons = element.getElementsByClassName('entry-point_color');
  const closeButton = element.getElementsByClassName('entry-point_image-close')[0];
  const lowResDownloadButton = element.getElementsByClassName('entry-point_dropdown-link')[0];
  const highResDownloadButton = element.getElementsByClassName('entry-point_dropdown-link')[1];
  const imageSelectToolbarEl = element.getElementsByClassName('entry-point_image-select')[0];
  const colorSelectToolbarEl = element.getElementsByClassName('entry-point_color-select')[0];
  const imageSelectButtons = element.getElementsByClassName('entry-point_image-select_link');
  const loadingSpinner = element.getElementsByClassName('entry-point_lottie-wrap')[0];
  loadingSpinners[index] = loadingSpinner;
  const reader = new FileReader();
  readers[index] = reader;

  const fileField = element.getElementsByClassName('entry-point_file-upload-link')[0].children[0].children[0];
  fileField.accept = 'image/png, image/jpeg, image/jpg';
  fileFields[index] = fileField;
  

  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropUploadArea.addEventListener(eventName, preventDefaults, false)
  });

  ['dragenter', 'dragover'].forEach(eventName => {
    dropUploadArea.addEventListener(eventName, addHighlight(dropUploadArea), false)
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropUploadArea.addEventListener(eventName, removeHighlight(dropUploadArea), false)
  });

  dropUploadArea.addEventListener('drop', () => {
    fileUploaded('main file uploader', fileField.files[0].type, fileField.files[0].size, imgEl.naturalHeight, imgEl.naturalWidth);
    handleDrop(fileField);
  }, false);

  mainCta.addEventListener('click', () => {
    linkClicked('toolbar', mainCta.innerText, null);
    openAuthPortal();
  });


  lowResDownloadButton.addEventListener('click', () => {
    linkClicked('toolbar', lowResDownloadButton.innerText, null);
    addIsOpen(modalEl);
  });

  highResDownloadButton.addEventListener('click', () => {
    linkClicked('toolbar', highResDownloadButton.innerText, null);
    openAuthPortal();
  });

  closeButton.addEventListener('click', () => {
    addHideClass(imgElWrapper);
    addHideClass(colorSelectToolbarEl);
    removeHideClass(imageSelectToolbarEl);
    removeHideClass(uploadWrapper);
    fileField.value = '';
  });

  Array.from(imageSelectButtons).forEach(button => {
    button.addEventListener('click', async () => {
      let src = button.children[0].src;
      linkClicked('toolbar', src, null);
      let blob = await fetch(src).then(r => r.blob());
      const dt = new DataTransfer();
      dt.items.add(new File([blob], 'soona-image.jpg', {type: blob.type}));
      fileField.files = dt.files;
      fileField.dispatchEvent(new Event('change'));
    });
  });


  fileField.addEventListener('change', function () {
    if (fileField.value == '') { return; }
    fileUploaded('main file uploader', fileField.files[0].type, fileField.files[0].size, fileField.files[0].height, fileField.files[0].width);
    if (!['image/jpg', 'image/jpeg', 'image/png'].includes(fileField.files[0].type)) {
      alert('Please use a valid image');
      return;
    }
    reader.readAsDataURL(fileField.files[0]);
  });

  reader.addEventListener('load', async () => {
    removeHideClass(loadingSpinner);
    let tempImage = new Image();
    tempImage.src = reader.result;
    tempImage.onload = async function() {
      imgEl.src = resize(tempImage, maxLongestSide);
      originalImage.src = imgEl.src;
      let maskedImage = await requestCVImage(imgEl.src);
      if (maskedImage) {
        imgEl.src = maskedImage;
        imgEl.srcset = maskedImage;
      }
      addHideClass(loadingSpinner);
      addHideClass(uploadWrapper);
      addHideClass(imageSelectToolbarEl);
      removeHideClass(colorSelectToolbarEl);
      removeHideClass(imgElWrapper);
    }
  });

  imgEl.addEventListener('load', () => {
    if (imgEl.srcset){
    lowResDownloadButton.href = imgEl.srcset;
    } else {
      lowResDownloadButton.href = imgEl.src;
    }
  });

  parseColorButtons(colorButtons, element);
  setColorFromURL();
}

function setUpForceToAppPane(element, index) {
  const dropUploadArea = element.getElementsByClassName('entry-point_file-upload-border')[0];
  const loadingSpinner = document.getElementsByClassName('entry-point_lottie-wrap')[0];
  loadingSpinners[index] = loadingSpinner;
  const reader = new FileReader();
  readers[index] = reader;

  const fileField = element.getElementsByClassName('entry-point_file-upload-link')[0].children[0].children[0];
  fileField.accept = 'image/png, image/jpeg, image/jpg';

  fileFields[index] = fileField;
  

  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropUploadArea.addEventListener(eventName, preventDefaults, false)
  });

  ['dragenter', 'dragover'].forEach(eventName => {
    dropUploadArea.addEventListener(eventName, addHighlight(dropUploadArea), false)
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropUploadArea.addEventListener(eventName, removeHighlight(dropUploadArea), false)
  });

  dropUploadArea.addEventListener('drop', () => {
    fileUploaded('main file uploader', fileField.files[0].type, fileField.files[0].size, fileField.files[0].height, fileField.files[0].width);
    handleDrop(fileField);
  }, false);

  fileField.addEventListener('change', function () {
    if (fileField.value == '') { return; }
    fileUploaded('main file uploader', fileField.files[0].type, fileField.files[0].size, fileField.files[0].height, fileField.files[0].width);
    if (!['image/jpg', 'image/jpeg', 'image/png'].includes(fileField.files[0].type)) {
      alert('Please use a valid image');
      return;
    }
    reader.readAsDataURL(fileField.files[0]);
  });

  reader.addEventListener('load', async () => {
    imgSrcs[index] = reader.result;
    openAuthPortal();
  });
}

document.addEventListener('DOMContentLoaded', async function () {
  const sparkMD5Script = document.createElement('script');
  const awsWafIntegrationScript = document.createElement('script');
  sparkMD5Script.src = 'https://cdnjs.cloudflare.com/ajax/libs/spark-md5/3.0.2/spark-md5.min.js';
  awsWafIntegrationScript.src = "https://f56533acd8b9.us-west-1.captcha-sdk.awswaf.com/f56533acd8b9/jsapi.js";
  document.head.appendChild(sparkMD5Script);
  document.head.appendChild(awsWafIntegrationScript);
  const observer = new MutationObserver((mutations, obs) => {
    const removeBackgroundTabPane = document.getElementById('w-tabs-1-data-w-pane-0');
    const changeBackgroundTabPane = document.getElementById('w-tabs-1-data-w-pane-1');
    const imageResizerTabPane = document.getElementById('w-tabs-1-data-w-pane-2');
    const removeBackgroundTab = document.getElementById('w-tabs-1-data-w-tab-0');
  const changeBackgroundTab = document.getElementById('w-tabs-1-data-w-tab-1');
  const imageResizerTab = document.getElementById('w-tabs-1-data-w-tab-2');
    if (removeBackgroundTabPane && changeBackgroundTabPane && imageResizerTabPane && removeBackgroundTab && changeBackgroundTab && imageResizerTab) {
      obs.disconnect();
      removeBackgroundTab.addEventListener('click', () => {
        linkClicked('tabs', 'remove background', null);
        resetVariables();
        currentTab = 0;
      });
    
      changeBackgroundTab.addEventListener('click', () => {
        linkClicked('tabs', 'change background', null);
        resetVariables();
        currentTab = 1;
      });  
    
      imageResizerTab.addEventListener('click', () => {
        linkClicked('tabs', 'image resizer', null);
        resetVariables();
        currentTab = 2;
      });
    
      setUpEditingPane(removeBackgroundTabPane, 0);
      setUpEditingPane(changeBackgroundTabPane, 1);
      setUpForceToAppPane(imageResizerTabPane, 2);
      return;
    }
  });
  observer.observe(document, {
    childList: true,
    subtree: true
  });
});
