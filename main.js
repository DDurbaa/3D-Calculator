import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

let scene, camera, renderer, controls;
let calculatorScreen = { material: null, context: "", mesh: null };
//npx vite

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);
    camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 1, 5000);
    camera.position.set(0, 150, 400);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.addEventListener('change', render);

    setupLights();
    createCalculator();
    setupEventListeners();
    setupKeyboardListeners();
    animate();
}

function setupLights() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(0, 20, 10);
    scene.add(directionalLight);
}

function createTextTexture(text, baseFontSize, fontface, color, backgroundColor, isScreen = false) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    let fontSize = baseFontSize;

    if (isScreen) {
        canvas.width = 300; 
        canvas.height = 80; 
        fontSize = 40; 
    } else {
        canvas.width = 70; 
        canvas.height = 70; 
        fontSize = 20; 
    }

    
    context.font = `${fontSize}px ${fontface}`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';

    context.fillStyle = backgroundColor;
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.fillStyle = color;
    context.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    return texture;
}



let currentOperation = { operand1: "", operand2: "", operator: "", result: "" };

function createButton(x, y, width, height, value, materialColor, text = '', textColor = 'white') {
    const frontMaterial = new THREE.MeshPhongMaterial({
        map: text ? createTextTexture(text, 24, "Arial", textColor, "transparent", false) : null 
    });
    const sideMaterial = new THREE.MeshPhongMaterial({
        color: materialColor,
    });

    const materials = [
        sideMaterial, // Right side
        sideMaterial, // Left side
        sideMaterial, // Top side
        sideMaterial, // Bottom side
        frontMaterial, // Front side
        sideMaterial  // Back side
    ];

    const buttonGeometry = new THREE.BoxGeometry(width, height, 2);
    const buttonMesh = new THREE.Mesh(buttonGeometry, materials);
    buttonMesh.position.set(x, y, 6);
    buttonMesh.userData = { value: value };
    
    scene.add(buttonMesh);
}


function createCalculator() {
    const bodyWidth = 120;
    const bodyHeight = 160;
    const bodyDepth = 10;

    const calculatorBody = new THREE.Mesh(
        new THREE.BoxGeometry(bodyWidth, bodyHeight, bodyDepth),
        new THREE.MeshPhongMaterial({ color: 0x222222 })
    );
    calculatorBody.position.set(0, 0, 0);
    scene.add(calculatorBody);

    const screenWidth = bodyWidth * 0.8;
    const screenHeight = 20;
    const screenPosX = 0;
    const screenPosY = bodyHeight / 2 - screenHeight - 10;

    calculatorScreen.material = new THREE.MeshBasicMaterial({ color: 0x444444 });
    calculatorScreen.mesh = new THREE.Mesh(
        new THREE.BoxGeometry(screenWidth, screenHeight, 1),
        calculatorScreen.material
    );
    calculatorScreen.mesh.position.set(screenPosX, screenPosY, 6);
    scene.add(calculatorScreen.mesh);

    const buttonWidth = 18;
    const buttonHeight = 18;
    const buttonPadding = 5;
    const columnCount = 4;
    const rowCount = 4;
    const startX = -(buttonWidth * columnCount + buttonPadding * (columnCount - 1)) / 2 + buttonWidth / 2;
    let yPos = screenPosY - screenHeight - buttonPadding - buttonHeight;

    const buttonValues = [
        ['7', '8', '9', '+'],
        ['4', '5', '6', '-'],
        ['1', '2', '3', '*'],
        ['0', 'DEL', '=', '/']
    ];

    buttonValues.forEach((row, rowIndex) => {
        let xPos = startX;
        row.forEach((value) => {
            createButton(xPos, yPos, buttonWidth, buttonHeight, value, '0x333333', value, 'white');
            xPos += buttonWidth + buttonPadding;
        });
        yPos -= buttonHeight + buttonPadding; 
    });
}

function setupKeyboardListeners() {
    document.addEventListener('keydown', function(event) {
        const key = event.key;
        const validKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '+', '-', '*', '/', '=', 'Delete', 'Enter'];
        if (validKeys.includes(key)) {
            handleKeyPress(key);
        }
    });
}

function handleKeyPress(key) {
    let value = key;
    switch (key) {
        case 'Enter':
            value = '=';
            break;
        case 'Delete':
            value = 'DEL';
            break;
    }

    const button = scene.children.find(obj => obj.userData.value === value);
    if (button) {
        pressButton(button);
        if (value === 'DEL') {
            handleDelete();
        } else if (!isNaN(value)) {
            handleNumber(value);
        } else {
            handleOperator(value);
        }
        updateScreen();
    }
}

let listenersSetUp = false;

function setupEventListeners() {
    if (!listenersSetUp) {
        window.addEventListener('resize', onWindowResize, false);
        renderer.domElement.addEventListener('click', onButtonClick, false);
        listenersSetUp = true;
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    render();
}
function onButtonClick(event) {
    event.preventDefault();
    const mouse = new THREE.Vector2(
        (event.clientX / renderer.domElement.clientWidth) * 2 - 1,
        -(event.clientY / renderer.domElement.clientHeight) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children);
    
    const buttonIntersect = intersects.find(intersect => intersect.object.userData.value !== undefined);

    if (buttonIntersect) {
        const value = buttonIntersect.object.userData.value;
    
        pressButton(buttonIntersect.object);
        
        if (value === 'DEL') {
            handleDelete();
        } else if (!isNaN(value)) {
            handleNumber(value);
        } else {
            handleOperator(value);
        }
        updateScreen();
    }
}
function pressButton(button) {
    button.scale.set(1, 1, 0.85);
    button.position.z -= 1; 
    
    setTimeout(() => {
        button.scale.set(1, 1, 1);
        button.position.z += 1; 
    }, 100);
}
function handleNumber(value) {
    calculatorScreen.context += value;
    if (currentOperation.operator) { 
        currentOperation.operand2 += value;
    } else { 
        currentOperation.operand1 += value;
    }
}

function handleOperator(operator) {
    if (operator === "=" && currentOperation.operand1 && currentOperation.operator && currentOperation.operand2) {
        performCalculation();
    } else if (!currentOperation.operator || (currentOperation.operator && !currentOperation.operand2)) {
        currentOperation.operator = operator; 
        calculatorScreen.context += operator; 
        updateScreen(); 
    } else if (currentOperation.operator && currentOperation.operand1 && currentOperation.operand2) {
        performCalculation();
        currentOperation.operator = operator;
        calculatorScreen.context = currentOperation.result + operator;
        updateScreen(); 
    }
}

function performCalculation() {
    const num1 = parseFloat(currentOperation.operand1);
    const num2 = parseFloat(currentOperation.operand2);
    let result = 0;

    switch (currentOperation.operator) {
        case '+':
            result = num1 + num2;
            break;
        case '-':
            result = num1 - num2;
            break;
        case '*':
            result = num1 * num2;
            break;
        case '/':
            result = num2 !== 0 ? num1 / num2 : "Error";
            break;
        default:
            result = "Error";
            break;
    }

  
    if (result !== "Error") {
        currentOperation.operand1 = result.toString(); 
        currentOperation.result = result.toString(); 
    } else {
        currentOperation.operand1 = ""; 
    }

    currentOperation.operand2 = "";
    currentOperation.operator = "";

    calculatorScreen.context = result.toString();
    updateScreen(); 
}


function handleDelete() {
    if (currentOperation.operand2) {
        currentOperation.operand2 = currentOperation.operand2.slice(0, -1);
    } else if (currentOperation.operator) {
        currentOperation.operator = "";
    } else if (currentOperation.operand1) {
        currentOperation.operand1 = currentOperation.operand1.slice(0, -1);
    }

    calculatorScreen.context = currentOperation.operand1 + currentOperation.operator + currentOperation.operand2;
    updateScreen();
}

function updateScreen() {
    calculatorScreen.material.map = createTextTexture(calculatorScreen.context, 24, 'Arial', 'white', 'transparent', true);
    calculatorScreen.material.needsUpdate = true;
}
function animate() {
    requestAnimationFrame(animate);
    render();
}

function render() {
    renderer.render(scene, camera);
}

init();
