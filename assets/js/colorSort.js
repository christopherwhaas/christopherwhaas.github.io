// Global Variable
var colorArray = [];

// On Loading, Generates an array of Color Squares
$(document).ready(function() {
    // Grab the default array value
    var slider = document.getElementById("size");
    var output = document.getElementById("size-output");


    // Attach functions to Buttons
    $('#new-array').on("click",  newArray);

    $('#sort-submit').on("click",  beginSort);


    // Create Color Array based on slider value
    setColors(slider.value);

    // Display the default slider value and create/display the squares
    output.innerHTML = slider.value;
    displaySquares(slider.value);

    //Change the Square disply when slider value changes
    slider.oninput = function() {
        output.innerHTML = this.value;
        displaySquares(this.value);
    } 
    

});


// Adjusts the size of the squares on resize
$( window ).resize(function() {

    var slider = document.getElementById("size");
    var output = document.getElementById("size-output");
    output.innerHTML = slider.value; // Display the default slider value
    updateSquares(slider.value);

  });


// Creates a number array the size of numSquares
function setColors(numSquares) {
    //Create the Color Array
    colorArray = [];
    for (var i = 0; i < numSquares; i++){
        colorArray.push(getRandomHex());
    }
}

//Adds new colors and returns new color array
function getNewColors(numSquares){
    var newColors = [];

    for (var i = 0; i < numSquares; i++){
        newColors.push(getRandomHex());
    }

    return newColors;
}

function newArray(){

    var slider = document.getElementById("size");
    setColors(slider.value);
    displaySquares(slider.value);

  }

function getDimensions(numSquares){
    //Ensure Responsive by getting the width of the container
    var width = $('#sorter').width();
    var dimension = ((width - numSquares * 10 - 10.2)) / (numSquares);

    if (dimension < 50.0){
        return dimension;
    }
     //Max size of square is 50
    return 50;

   
    
}


//Called to generate and display the squares 
function displaySquares(numSquares){
    
    //Check if enough colors generated
    if (numSquares <= colorArray.length){
        let arrayDiv = $('#array');
        let dim = getDimensions(numSquares);

        arrayDiv.empty();

        //Build array and display
        for (var i = 0; i < numSquares; i++){
            let color = colorArray[i];
            var square = document.createElement("div");
            square.style.width = dim  + "px";
            square.style.height = dim  + "px";
            square.className = "array-square";
            square.style.background = '#' + color;
            square.dataset.color = color;
            square.id = i;
            arrayDiv.append(square);
        }

    } else {
        //Add More to the colorsArray
        var newColors = getNewColors(numSquares);
        colorArray.push(...newColors);
        //Call function again
        displaySquares(numSquares);
    }

}


// Updates the Dimensions without Redrawing
function updateSquares(numSquares) {

    let dim = getDimensions(numSquares);
    var elements = document.querySelectorAll('.array-square');
    for(var i=0; i<elements.length; i++){
        elements[i].style.width = dim + "px";
        elements[i].style.height = dim + "px";
    }

}


//Used to generate a random hex 
// Adapted from 
// https://stackoverflow.com/questions/1484506/random-color-generator
function getRandomHex(numSquares){

  var letters = '0123456789abcdef';
  var color = '';
  for (var i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}


// Begin Sorting
function beginSort(){
    //Get selected algorithm and disable the filters
    var algo = getSelectionAndDisable();

    //Visualize the sorting
    visualize(algo);

}


//Disables filters and returns the selected Algorithm
function getSelectionAndDisable(){

    var inputs = document.getElementsByTagName('input');
    var selected = "selection";
              
    for(i = 0; i < inputs.length; i++) {

        if(inputs[i].type == "radio") {
            
            if(inputs[i].checked){

                selected = inputs[i].value;

            }      

        }

    inputs[i].disabled = true;  

    }


    $('#new-array').off('click');

    $('#sort-submit').off('click');

    $('#filter-content').css('opacity', '0.2');

    return selected;


    
}


//Re-enables the Filters o the left
function enableFilters() {

    var inputs = document.getElementsByTagName('input');
   
    for(i = 0; i < inputs.length; i++) {

        inputs[i].disabled = false;

    }

    $('#new-array').on("click",  newArray);    

    $('#sort-submit').on("click",  beginSort);

    $('#filter-content').css('opacity', '1');

   

}

//Calls the specific algorithm
function visualize(algo){
    let n = document.querySelectorAll(".array-square").length;

    switch (algo) {
        case "selection":
            selectionSort(n);
            break;

        case "bubble":
            bubbleSort(n);
            break;

        // case "insertion":
    
        //     break;

        // case "merge":
        
        //     break;

        // case "quick":
    
        //     break;
    }


}





// SORTING ALGORITMS


//Helper Functions
function toggleHighlight(i){

    $('#'+i).toggleClass("highlighted");
    
}

function toggleFinal(i){

    $('#'+i).toggleClass("final");
    
}

//Creates a promis that completes after given time
function delay(time) {
    return new Promise(resolve => setTimeout(resolve, time));
  }



//Bubble Sort
async function bubbleSort(n){


    for (i=0; i < n; i++){

        for(j=0; j<n-1-i; j++){
            //Show Selected
            toggleHighlight(j);
            toggleHighlight(j+1);
            
            let a = colorArray[j];
            let b = colorArray[j + 1];

            // Comparee RGB Value in the form of an int of 255255255
            if (a.convertToRGB() > b.convertToRGB()) {
                

                var array = document.getElementById('array');
                var children = document.getElementById('array').childNodes;
        
                //Swap Elements Visually
                $('#'+ (j)).swap({
                    target: (j+1).toString(), 
                    opacity: "0.7", 
                    speed: 50, 
                });

                //Wait until Animation Finished
                await delay(51);

                //Swap Elements in the DOM and update their Position back to 0px
                children[j].style.left = '0px';

                children[j+1].style.left = '0px';

                array.insertBefore(children[j+1] , children[j]);

                colorArray[j] = b;
                colorArray[j+1] =  a;

                children[j].id = j.toString();
                children[j+1].id = (j+1).toString();

            }

            await delay(100);

            toggleHighlight(j);
            toggleHighlight(j+1);
        }

        toggleFinal(n-1-i);

    }
   
    enableFilters();
   
}





// SELECTION SORT
async function selectionSort(n) { 

    // ABLE to sort but no animation

    await delay(100);
   
        
    // for( i = 0; i < n; i++) {
    //     // Finding the smallest number in the subarray
    //     var min = i;
    //     for( j = i+1; j < n; j++){
    //         toggleHighlight(j);
    //         // await delay(100);
    //         if(colorArray[j].convertToRGB() < colorArray[min].convertToRGB()) {
    //             min=j; 
    //         }else{
                
    //         }
            
    //         toggleHighlight(j);
    //      }
         
    //      if (min != i) {
    //          // Swapping the elements
            

    //         var array = document.getElementById('array');
    //         var children = document.getElementById('array').childNodes;

            

    //         array.insertBefore(children[i] , children[min]);

    //         children[i].id = i.toString();
    //         children[min].id = min.toString();


    //          var tmp = colorArray[i]; 
    //          colorArray[i] = colorArray[min];
    //          colorArray[min] = tmp;   
    //         //  await delay(100);   
             
    //     }else{
    //         // await delay(100);
    //     }
    
    // }
    enableFilters();
}




String.prototype.convertToRGB = function(){
    var aRgbHex = this.match(/.{1,2}/g);
    var aRgb = (parseInt(aRgbHex[0], 16)*1000000) + (parseInt(aRgbHex[1], 16)*1000) + parseInt(aRgbHex[2], 16);
    return aRgb;
}