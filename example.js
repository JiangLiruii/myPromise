function getUserId() {
  return new Promise(function (resolve) {
      resolve(9876);
  });
}

getUserId()
    .then(getUserJobById)
    .then(function (job) {
        console.log(job)
    });
function getUserJobById(id) {
    return new Promise(function (resolve) {
        setTimeout((id) => {
          console.log(id)
          resolve(123)
        });
    });
}