var container = document.getElementById('show')
function addLog(text) {
  const div = document.createElement('div');
  div.innerText = text;
  container.appendChild(div);
}
function getUserId() {
  return new Promise(function (resolve) {
      resolve(9527);
  });
}

function getUserJobById(id) {
  addLog(id) // 9527
  return new Promise(function (resolve) {
    setTimeout(function(){
      resolve('spy')
    }, 2000)
  });
}

getUserId().then(getUserJobById) // promise
.then(function (job) {
  addLog(job) // spy
});
addLog('in macrotask')
setTimeout(() => addLog('another macrotask'))