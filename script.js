let timer;
let poNumberColNumber = -1;
let pmColNumber = -1;
let taskColNumber = -1;
let amountColNumber = -1;
let statusColNumber = -1;
let descriptionColNumber = -1;
let url = null;

$(document).ready(function () {
  defineUrl();
  if($('#poContent').length == 1) timer = setInterval(function(){
    console.log('Waiting...');
    if($('#poContent tr').length > 1){
        clearInterval(timer);
        processData();
    }
  }, 1000);
})


function defineUrl(){
    function buildUrl(result) {
        const serverUrl = result.serverUrl || null;
        const authToken = result.authToken || null;

        if(serverUrl !== null && authToken !== null){
          url = serverUrl + "/" + authToken + "/";
        }
    }

    function onError(error) {
        console.log(`Error: ${error}`);
    }

    let getting = browser.storage.sync.get(["serverUrl","authToken"]);
    getting.then(buildUrl, onError);
}


function processData(){
  if(url === null){
    $('body').append($('<div class="status_block"></div>').text("Define app parameters!"));
    return;
  }
  console.log(url);

  $('body').append($('<div class="status_block"></div>').text("Working..."));
  
  const tableHeader = $('#poContent th');
  const tableRows = $('#poContent tr');
  
  for(let i = 0; i < tableHeader.length; i++){
    const title = $(tableHeader[i]).text().toLowerCase();
    if(title.includes('po number')) poNumberColNumber = i;
    else if(title.includes('pm')) pmColNumber = i;
    else if(title.includes('task')) taskColNumber = i;
    else if(title.includes('amount')) amountColNumber = i;
    else if(title.includes('status')) statusColNumber = i;
    else if(title.includes('description')) descriptionColNumber = i;
  }
  
  const data = [];
  for(let i = 0; i < tableRows.length; i++){
      const values = $(tableRows[i]).find('td');
      if(values.length !== 0){
        
        const item = {};
        item.position = i;
        item.number = $(values[poNumberColNumber]).text().trim();
        item.totalAgreed = $(values[amountColNumber]).text().match(/\d+(.\d+)?/)[0];
        item.status = $(values[statusColNumber]).text().trim();
        let description = $(values[descriptionColNumber]).attr('title').trim();
        let descrPrefix = "Project Name:";
        descrPrefixIndex = description.indexOf(descrPrefix);
        if(descrPrefixIndex != -1){
           description = description.substring(descrPrefixIndex + descrPrefix.length)
        }
        item.description = description.trim();
        
        data.push(item);
      }
  }
  
  $.ajax({
    method: "POST",
    url: url,
    processData: false,
    data: JSON.stringify(data),
    contentType: "application/json",
    dataType: 'json'
  }).fail(function(xhr){
    const response = JSON.parse(xhr.responseText);
    $('.status_block').empty().append(response.message);
  }).done(function(response){
    const allItems = response.allItems;
    const exclusiveClientPOs = response.exclusiveClientPOs;
    const exclusiveXtrfPOs = response.exclusiveXtrfPOs;

    
    // Mark all client PO which are absent in XTRF replace short description by full text 
    $.each(exclusiveClientPOs, function(){
      const po = this;
      const row = tableRows[this.position];
      $(row).addClass('exclusive_client_po processed_item');
      const descCell = $(row).find('td').get(descriptionColNumber);
      $(descCell).empty().text(this.description).addClass('project_description');
    })

    // Mark all client PO which have incorrect total agreed
    $.each(allItems, function(){
      const row = tableRows[this.position];
      if(this.incorrect){
        const po = this;
        $(row).addClass('incorrect_client_po processed_item');
        const pm = $(row).find('td').get(pmColNumber);
        const task = $(row).find('td').get(taskColNumber);
        $(pm).empty();
        $(task).empty();

        $.each(this.relatedTasks, function(){
           $(pm).text($(pm).text() + " " + this.projectManager);
           $(task).text($(task).text() + " " + this.projectIdNumber)
        });
      } else if(this.status.toLowerCase() === 'to accept' && !$(row).hasClass('exclusive_client_po')){
        $(row).addClass('can_be_accepted processed_item');
      }
    })

    // Add new rows of all PO which are in the XTRF but absent here to the top of table
    const columnCount = $(tableRows[1]).find('td').length;
    $.each(exclusiveXtrfPOs, function(){
      const po = this;
      const row = $('<tr></tr>');
      row.addClass('exclusive_xtrf_po');

      for(let i = 0; i < columnCount; i++){
        const cell = $('<td></td>');
        let pm;
        let task;
        let amount;
        row.append(cell);
        if(i == poNumberColNumber) cell.text('-');
        else if(i == descriptionColNumber) cell.text(this.number).addClass('project_description');
        else if(i == pmColNumber) pm = cell;
        else if(i == taskColNumber) task = cell;
        else if(i == amountColNumber) amount = cell;
        
        $.each(this.relatedTasks, function(){
            $(pm).text($(pm).text() + " " + this.projectManager);
            $(task).text($(task).text() + " " + this.projectIdNumber);
            let totalAgreed = parseFloat($(amount).text());
            $(amount).text(isNaN(totalAgreed) ? parseFloat(this.totalAgreed) : totalAgreed + parseFloat(this.totalAgreed));
          });
      }
      $('#poContent tbody').prepend(row);
      sortAddedRows(taskColNumber);
      addShowHideButtons();
      $('.status_block').fadeOut(1200, function(){
        $(this).remove();
      });
    });
  });

  
  
}

// Order added rows by xtrf task name
function sortAddedRows(taskColNumber) {
    const  addedRows = $('#poContent .exclusive_xtrf_po').get();
    addedRows.sort(function(a, b) {
        var A = $(a).children('td').eq(taskColNumber).text().toUpperCase();
        var B = $(b).children('td').eq(taskColNumber).text().toUpperCase();

        if(A < B) return 1
        else if(A > B) return -1;
        else return 0;
    });

    $.each(addedRows, function(index, row) {
        $('#poContent tbody').prepend(row);
    });
}

function addShowHideButtons(){
  var lastCell = $('thead th:last-child');
  lastCell.empty().unbind('click').unbind('mousedown');
  lastCell.addClass('opt_selector');
  lastCell.append($('<span class="hide_unprocessed">Hide</span>').attr('onclick', '$("#poContent tbody tr").not(".exclusive_xtrf_po, .processed_item").css("display", "none"); $(".opt_selector").toggleClass("opt_active");'));
  lastCell.append($('<span class="show_unprocessed">Show</span>').attr('onclick', '$("#poContent tbody tr").not(".exclusive_xtrf_po, .processed_item").css("display", ""); $(".opt_selector").toggleClass("opt_active");'));
}