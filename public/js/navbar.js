document.addEventListener("DOMContentLoaded", function () {
  var navbarHeight = document.querySelector(".navbar").offsetHeight;
  document.body.style.paddingTop = navbarHeight + "px";
});

window.onresize = function () {
  var navbarHeight = document.querySelector(".navbar").offsetHeight;
  document.body.style.paddingTop = navbarHeight + "px";
};
