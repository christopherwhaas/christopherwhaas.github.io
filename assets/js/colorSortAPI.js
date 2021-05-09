// Global Variable
var colorArray = [];
var colorSet = false;


document.addEventListener("DOMContentLoaded", async() => {
    var slider = document.getElementById("size");
    var output = document.getElementById("size-output");


    try{
        
        colorArray = await getRandomColors(slider.value);
        colorSet = true;
        
    } catch (err) {

        console.log(err);
        colorSet = false;
    }

    if (colorSet){
        output.innerHTML = slider.value; // Display the default slider value
        displaySquares(slider.value);
    
        slider.oninput = function() {
            output.innerHTML = this.value;
            displaySquares(this.value);
        } 
        
    } else {
        console.log("Problem With API");

    }
    
   
});

async function newArray(){

    colorSet = false;

    var slider = document.getElementById("size");
    let numSquares = slider.value;

    console.log(colorArray);

    try{

        var refreshCall = await getRandomColors(parseInt(numSquares)+1);
        refreshCall.pop();
        colorArray = refreshCall;
        colorSet = true;


    } catch (err) {

        console.log(err);

    }

    if (colorSet){

        displaySquares(numSquares);

    } else {

        console.log("colors not set on new array");

    }
    

  }


$( window ).resize(function() {

    var slider = document.getElementById("size");
    var output = document.getElementById("size-output");
    output.innerHTML = slider.value; // Display the default slider value
    updateSquares(slider.value);

  });



function getDimensions(numSquares){

    var width = $('#sorter').width();
    var dimension = ((width - numSquares * 10 - 10.2)) / (numSquares);

    if (dimension < 50.0){
        return dimension;
    }
    return 50;

    //Max size of square is 50
    
}


async function displaySquares(numSquares){
    let arrayDiv = $('#array');
    let dim = getDimensions(numSquares);

    if (colorSet) {

        if (numSquares <= colorArray.length){
            arrayDiv.empty();
    
            for (var i = 0; i < numSquares; i++){
                let color = colorArray[i].hex;
    
                var square = document.createElement("div");
                square.style.width = dim  + "px";
                square.style.height = dim  + "px";
                square.className = "array-square";
                square.style.background = '#' + color;
                square.dataset.color = color;
                arrayDiv.append(square);
                
            }
        } else {
            colorSet = false;
            //Add more colors
            try {
                var newColors = await getRandomColors(numSquares);
                colorArray.push(...newColors);
                colorSet = true;
                
            } catch (err) {
                console.log(err);
            }

            if (colorSet){

                displaySquares(numSquares);

            }
    
        }

    }

    
    
    

}

function updateSquares(numSquares) {
    let dim = getDimensions(numSquares);
    var elements = document.querySelectorAll('.array-square');
    for(var i=0; i<elements.length; i++){
        elements[i].style.width = dim + "px";
        elements[i].style.height = dim + "px";
    }
}


async function getRandomColors(numSquares){
    
    var url = "https://www.colr.org/json/colors/random/";
    url = url + numSquares;

    const colorsData = await fetch(url)

    const colorsJSON = await colorsData.json();

    const colors= await colorsJSON.colors;

    return colors;


       

}
