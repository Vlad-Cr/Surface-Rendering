'use strict';

let gl;                         // The webgl context.
let surface;                    // A surface model
let shProgram;                  // A shader program
let spaceball;                  // A SimpleRotator object that lets the user rotate the view by mouse.

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

    this.iReverseLightDirectionLocation = -1

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

    let rotateToPointZero = m4.axisRotation([0.707,0.707,0], 0.7);
    let translateToPointZero = m4.translation(0,0,-10);

    let matAccum0 = m4.multiply(rotateToPointZero, modelView );
    let matAccum1 = m4.multiply(translateToPointZero, matAccum0 );
        
    /* Multiply the projection matrix times the modelview matrix to give the
       combined transformation matrix, and send that to the shader program. */
    let modelViewProjection = m4.multiply(projection, matAccum1 );

    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjection );
    
    gl.uniform4fv(shProgram.iColor, [0.5,0.5,0.5,1] );

    gl.uniform3fv(shProgram.iReverseLightDirectionLocation, m4.normalize([0.5, 0.7, 1]));

    surface.Draw();
}

function CreateSurfaceData()
{
    let step = 5.0;
    let uend = 360 + step;
    let vend = 90 + step;
    let a = 1;
    let b = 1;
    let c = 1;

    let vertexList = [];
    
    for (let u = 0; u < uend; u += step) {
        for (let v = 0; v < vend; v += step) {
            let uRad =  deg2rad(u);
            let vRad = deg2rad(v);

            let unext = deg2rad(u + step);

            /*
            *-------*
            |       |
            |       |
            0-------*
            */
            let x = vRad * Math.cos(uRad);
            let y = vRad * Math.sin(uRad);
            let z = c * Math.sqrt(a * a - (b * b * Math.cos(uRad) * Math.cos(uRad)));
            vertexList.push( x, y, z );

            /*
            0-------*
            |       |
            |       |
            *-------*
            */
            x = vRad * Math.cos(unext);
            y = vRad * Math.sin(unext);
            z = c * Math.sqrt(a * a - (b * b * Math.cos(unext) * Math.cos(unext)));
            vertexList.push( x, y, z );
        }
    }

    return vertexList;
}

function CreateNormalsData()
{
    let step = 5.0;
    let uend = 360 + step;
    let vend = 90 + step;
    let a = 1;
    let b = 1;
    let c = 1;

    let normalsList = [];
    
    for (let u = 0; u < uend; u += step) {
        for (let v = 0; v < vend; v += step) {
            let currentPoints = [];
            let uRad =  deg2rad(u);
            let vRad = deg2rad(v);

            let vnext = deg2rad(v + step);
            let unext = deg2rad(u + step);

            /*
            *-------*
            |       |
            |       |
            0-------*
            */
            let x = vRad * Math.cos(uRad);
            let y = vRad * Math.sin(uRad);
            let z = c * Math.sqrt(a * a - (b * b * Math.cos(uRad) * Math.cos(uRad)));
            currentPoints.push( [x, y, z] );

            /*
            1-------*
            |       |
            |       |
            *-------*
            */
            x = vRad * Math.cos(unext);
            y = vRad * Math.sin(unext);
            z = c * Math.sqrt(a * a - (b * b * Math.cos(unext) * Math.cos(unext)));
            currentPoints.push( [x, y, z] );

            /*
            *-------*
            |       |
            |       |
            *-------2
            */
            x = vnext * Math.cos(uRad);
            y = vnext * Math.sin(uRad);
            z = c * Math.sqrt(a * a - (b * b * Math.cos(uRad) * Math.cos(uRad)));
            currentPoints.push( [x, y, z] );

             /*
            *-------3
            |       |
            |       |
            *-------*
            */
            x = vnext * Math.cos(unext);
            y = vnext * Math.sin(unext);
            z = c * Math.sqrt(a * a - (b * b * Math.cos(unext) * Math.cos(unext)));
            currentPoints.push( [x, y, z] );

            let result = [];
            result = m4.cross(CreateVector(currentPoints[2], currentPoints[0]), CreateVector(currentPoints[1], currentPoints[0]));
            normalsList.push(result[0], result[1], result[2]);

            result = [];
            result = m4.cross(CreateVector(currentPoints[0], currentPoints[1]), CreateVector(currentPoints[3], currentPoints[1]));
            normalsList.push(result[0], result[1], result[2]);

             //////////////////////////////
        }
    }

    return normalsList;
}

function CreateVector(a, b)
{
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}



/* Initialize the WebGL context. Called from init() */
function initGL() {
    let prog = createProgram( gl, vertexShaderSource, fragmentShaderSource );

    shProgram = new ShaderProgram('Basic', prog);
    shProgram.Use();

    shProgram.iAttribVertex              = gl.getAttribLocation(prog, "vertex");
    shProgram.iNormalVertex              = gl.getAttribLocation(prog, "normal");
    shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(prog, "ModelViewProjectionMatrix");
    shProgram.iColor                     = gl.getUniformLocation(prog, "color");
    shProgram.iReverseLightDirectionLocation = gl.getUniformLocation(prog, "reverseLightDirection");

    surface = new Model('Surface');
    surface.BufferData(CreateSurfaceData(), CreateNormalsData());

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
