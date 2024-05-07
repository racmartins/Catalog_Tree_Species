document.getElementById("menu-toggle").addEventListener("click", function () {
  var area2 = document.querySelector(".area2");
  area2.style.display = area2.style.display === "none" ? "block" : "none";
});

// Inicialmente, o menu deve estar oculto em ecrãs mais pequenos
document.addEventListener("DOMContentLoaded", function () {
  if (window.innerWidth <= 768) {
    document.querySelector(".area2").style.display = "none";
  }
});
