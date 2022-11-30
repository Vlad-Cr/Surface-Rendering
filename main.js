'use strict';

let gl;                         // The webgl context.
let surface;                    // A surface model
let shProgram;                  // A shader program
let spaceball;                  // A SimpleRotator object that lets the user rotate the view by mouse.
let TParam = 0;
let InputCounter = 0.0;

function deg2rad(angle) {
    return angle * Math.PI / 180;
}

// Constructor
function Model(name) {
    this.name = name;
    this.iVertexBuffer = gl.createBuffer();
    this.iNormalBuffer = gl.createBuffer();
    this.count = 0;

    this.BufferData = function(vertices, normals) {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);
       
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STREAM_DRAW);

        this.count = vertices.length/3;
    }

    this.Draw = function() {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer);
        gl.vertexAttribPointer(shProgram.iNormalVertex, 3, gl.FLOAT, true, 0, 0);
        gl.enableVertexAttribArray(shProgram.iNormalVertex);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.count);
    }
}

// Constructor
function ShaderProgram(name, program) {

    this.name = name;
    this.prog = program;

    // Location of the attribute variable in the shader program.
    this.iAttribVertex = -1;
    // Location of the normal variable in the shader program.
    this.iNormalVertex = -1;
    // Location of the uniform specifying a color for the primitive.
    this.iColor = -1;
    // Location of the uniform matrix representing the combined transformation.
    this.iModelViewProjectionMatrix = -1;

    this.iWorldMatrix = -1;

    this.iReverseLightDirectionLocation = -1

    this.iLightWorldPosition = -1;

    this.iWorldMatrix = -1;

    this.iViewWorldPosition = -1;

    this.Use = function() {
        gl.useProgram(this.prog);
    }
}

function draw() { 
    gl.clearColor(1,1,1,1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.enable(gl.CULL_FACE);

    // Enable the depth buffer
    gl.enable(gl.DEPTH_TEST);
    
    /* Set the values of the projection transformation */
    let projection = m4.perspective(Math.PI/8, 1, 8, 12); 
    
    /* Get the view matrix from the SimpleRotator object.*/
    let modelView = spaceball.getViewMatrix();
    
    gl.uniform3fv(shProgram.iViewWorldPosition, [0,0,0]);

    let rotateToPointZero = m4.axisRotation([0.707,0.707,0], 0.7);
    let translateToPointZero = m4.translation(0,0,-10);

    let matAccum0 = m4.multiply(rotateToPointZero, modelView );
    let matAccum1 = m4.multiply(translateToPointZero, matAccum0 );

    let parabolaParams = CalcParabola();
    gl.uniform3fv(shProgram.iLightWorldPosition, parabolaParams);

    /* Multiply the projection matrix times the modelview matrix to give the
       combined transformation matrix, and send that to the shader program. */
    let modelViewProjection = m4.multiply(projection, matAccum1 );
    var worldInverseMatrix = m4.inverse(matAccum1);
    var worldInverseTransposeMatrix = m4.transpose(worldInverseMatrix);

    gl.uniformMatrix4fv(shProgram.iWorldInverseTranspose, false, worldInverseTransposeMatrix);
    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjection );
    gl.uniformMatrix4fv(shProgram.iWorldMatrix, false, matAccum1 );
    
    gl.uniform4fv(shProgram.iColor, [0.5,0.5,0.5,1] );

    gl.uniform3fv(shProgram.iReverseLightDirectionLocation, m4.normalize([0.5, 0.7, 1]));

    surface.Draw();
}

function CreateSurfaceData()
{
    let step = 1.0;
    let uend = 360 + step;
    let vend = 90 + step;
    let DeltaU = 0.0001;
    let DeltaV = 0.0001;

    let vertexList = [];
    let normalsList = [];

    for (let u = 0; u < uend; u += step) {
        for (let v = 0; v < vend; v += step) {
            let unext = u + step;

            /*
            *-------*
            |       |
            |       |
            0-------*
            */
            let x = CalcX(u, v);
            let y = CalcY(u, v);
            let z = CalcZ(u, v);
            vertexList.push( x, y, z );

            /*
            0-------*
            |       |
            |       |
            *-------*
            */
            x = CalcX(unext, v);
            y = CalcY(unext, v);
            z = CalcZ(unext, v);
            vertexList.push( x, y, z );

            // Normals

            let DerivativeU = CalcDerivativeU(u, v, DeltaU);
            let DerivativeV = CalcDerivativeV(u, v, DeltaV);

            let result = m4.cross(DerivativeV, DerivativeU);
            normalsList.push(result[0], result[1], result[2]);

            DerivativeU = CalcDerivativeU(unext, v, DeltaU);
            DerivativeV = CalcDerivativeV(unext, v, DeltaV);

            result = m4.cross(DerivativeV, DerivativeU);
            normalsList.push(result[0], result[1], result[2]);
        }
    }

    return [vertexList, normalsList];
}

function CalcX(u, v)
{
    let uRad =  deg2rad(u);
    let vRad = deg2rad(v);

    return vRad * Math.cos(uRad);
}

function CalcY(u, v)
{
    let uRad =  deg2rad(u);
    let vRad = deg2rad(v);

    return vRad * Math.sin(uRad);
}

function CalcZ(u, v)
{
    let a = 1;
    let b = 1;
    let c = 1;

    let uRad =  deg2rad(u);
    let vRad = deg2rad(v);

    return c * Math.sqrt(a * a - (b * b * Math.cos(uRad) * Math.cos(uRad)));
}

function CalcDerivativeU(u, v, uDelta)
{
    let x = CalcX(u, v);
    let y = CalcY(u, v);
    let z = CalcZ(u, v);

    let Dx = CalcX(u + uDelta, v);
    let Dy = CalcY(u + uDelta, v);
    let Dz = CalcZ(u + uDelta, v);

    let Dxdu = (Dx - x) / deg2rad(uDelta);
    let Dydu = (Dy - y) / deg2rad(uDelta);
    let Dzdu = (Dz - z) / deg2rad(uDelta);

    return [Dxdu, Dydu, Dzdu];
}

function CalcDerivativeV(u, v, vDelta)
{
    let x = CalcX(u, v);
    let y = CalcY(u, v);
    let z = CalcZ(u, v);

    let Dx = CalcX(u, v + vDelta);
    let Dy = CalcY(u, v + vDelta);
    let Dz = CalcZ(u, v + vDelta);

    let Dxdv = (Dx - x) / deg2rad(vDelta);
    let Dydv = (Dy - y) / deg2rad(vDelta);
    let Dzdv = (Dz - z) / deg2rad(vDelta);

    return [Dxdv, Dydv, Dzdv];
}

/* Initialize the WebGL context. Called from init() */
function initGL() {
    let prog = createProgram( gl, vertexShaderSource, fragmentShaderSource );

    shProgram = new ShaderProgram('Basic', prog);
    shProgram.Use();

    shProgram.iAttribVertex              = gl.getAttribLocation(prog, "vertex");
    shProgram.iNormalVertex              = gl.getAttribLocation(prog, "normal");
    shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(prog, "ModelViewProjectionMatrix");
    shProgram.iWorldInverseTranspose     = gl.getUniformLocation(prog, "WorldInverseTranspose");
    shProgram.iColor                     = gl.getUniformLocation(prog, "color");
    shProgram.iReverseLightDirectionLocation = gl.getUniformLocation(prog, "reverseLightDirection");
    shProgram.iLightWorldPosition        = gl.getUniformLocation(prog, "LightWorldPosition");
    shProgram.iWorldMatrix               = gl.getUniformLocation(prog, "WorldMatrix");
    shProgram.iViewWorldPosition         = gl.getUniformLocation(prog, "ViewWorldPosition");

    surface = new Model('Surface');
    let SurfaceData = CreateSurfaceData();
    surface.BufferData(SurfaceData[0], SurfaceData[1]);

   // gl.enable(gl.DEPTH_TEST);
}


/* Creates a program for use in the WebGL context gl, and returns the
 * identifier for that program.  If an error occurs while compiling or
 * linking the program, an exception of type Error is thrown.  The error
 * string contains the compilation or linking error.  If no error occurs,
 * the program identifier is the return value of the function.
 * The second and third parameters are strings that contain the
 * source code for the vertex shader and for the fragment shader.
 */
function createProgram(gl, vShader, fShader) {
    let vsh = gl.createShader( gl.VERTEX_SHADER );
    gl.shaderSource(vsh,vShader);
    gl.compileShader(vsh);
    if ( ! gl.getShaderParameter(vsh, gl.COMPILE_STATUS) ) {
        throw new Error("Error in vertex shader:  " + gl.getShaderInfoLog(vsh));
     }
    let fsh = gl.createShader( gl.FRAGMENT_SHADER );
    gl.shaderSource(fsh, fShader);
    gl.compileShader(fsh);
    if ( ! gl.getShaderParameter(fsh, gl.COMPILE_STATUS) ) {
       throw new Error("Error in fragment shader:  " + gl.getShaderInfoLog(fsh));
    }
    let prog = gl.createProgram();
    gl.attachShader(prog,vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);
    if ( ! gl.getProgramParameter( prog, gl.LINK_STATUS) ) {
       throw new Error("Link error in program:  " + gl.getProgramInfoLog(prog));
    }
    return prog;
}

/**
 * initialization function that will be called when the page has loaded
 */
function init() {
    // Canvas
    let canvas;
    try {
        canvas = document.getElementById("webglcanvas");
        gl = canvas.getContext("webgl");
        if ( ! gl ) {
            throw "Browser does not support WebGL";
        }
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not get a WebGL graphics context.</p>";
        return;
    }

    // GL
    try {
        initGL();  // initialize the WebGL graphics context
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not initialize the WebGL graphics context: " + e + "</p>";
        return;
    }

    spaceball = new TrackballRotator(canvas, draw, 0);

    draw();
}

window.addEventListener("keydown", function (event) {  
    switch (event.key) {
      case "ArrowLeft":
        ProcessArrowLeftDown();
        break;
      case "ArrowRight":
        ProcessArrowRightDown();
        break;
      default:
        return; 
    }
});

function ProcessArrowLeftDown()
{
    InputCounter -= 0.1;
    TParam = Math.sin(InputCounter) * 2;

    draw();
}

function ProcessArrowRightDown()
{
    InputCounter += 0.1;
    TParam = Math.sin(InputCounter) * 2;

    draw();
}

function CalcParabola()
{
    return [TParam, TParam * TParam, 20];
}
