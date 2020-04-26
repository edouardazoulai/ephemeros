// Generates a uuid. Taken from:
// https://stackoverflow.com/questions/105034/how-to-create-guid-uuid#answer-2117523
function uuidv4() {
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
}

const baseUrl = window.location.origin + '/chat/';

// Modifies DOM once it is loaded.
$(function () {
  $('#generated_container').addClass('d-none');
  $('#generate').click(function() {
    var newLink = baseUrl + uuidv4();
    $('#generated').text(newLink);
    $('#generated').attr('href', newLink);
    $('#generated_container').removeClass('d-none').addClass('d-inline-flex');
  });
});