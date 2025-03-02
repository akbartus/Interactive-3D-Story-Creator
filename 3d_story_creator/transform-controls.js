// Switch to Camera Mode and the camera entity from the scene
  document.addEventListener('keydown', (event) => {
    if (event.altKey && event.key === 'c') {  // Check for 'E' key press
      // Get the camera entity
      const cameras = document.querySelectorAll('[camera]');
      
      // Check if the camera entity exists
      if (cameras) {
        // Get the current 'active' state of the camera component
        let isActive = cameras[1].getAttribute('camera').active;
  
        // Toggle the 'active' state
        cameras[1].setAttribute('camera', 'active', isActive ? 'false' : 'true');
        cameras[0].setAttribute('camera', 'active', isActive ? 'true' : 'false');
        
      } 
      
    }
  });


// Register the custom a-grid primitive
AFRAME.registerPrimitive('a-grid', {
  defaultComponents: {
    geometry: {
      primitive: 'plane',
      width: 75,
      height: 75
    },
    rotation: { x: -90, y: 0, z: 0 },
    material: {
      src: 'url(https://cdn.jsdelivr.net/gh/donmccurdy/aframe-extras@v1.16.3/assets/grid.png)',
      repeat: '75 75'
    }
  },
  mappings: {
    width: 'geometry.width',
    height: 'geometry.height',
    src: 'material.src'
  }
});


/////////////////////////////
// Transform Controls ///////
////////////////////////////
class Editor {
  constructor() {
    this.selectEntity = null;
    this.sceneEl = document.querySelector("a-scene");
    this.scene = this.sceneEl.object3D;

    this.camera = null;
    this.cameraEl = null;

    this.entities = [];

    this.geometry = new THREE.SphereGeometry(2, 4, 2);
    this.material = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      visible: false,
      side: THREE.FrontSide
    });

    this.initEntities();

    this.createCamera();
    this.createHelper();

    // Initialize currentMode to 'translate'
    this.currentMode = 'translate';

    // Track the previous transform mode
    this.previousTransformMode = 'translate';

    // Add event listeners for tooltip input fields
    this.addTooltipEventListeners();

    this.addTransformIconListeners();

    // Add event listeners for alignment icons
    this.addAlignmentIconListeners();

    // Add event listeners for color picker
    this.addColorPickerListener();

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Delete') {
        this.deleteSelectedEntity();
      } else if (event.altKey && event.key === 'r') { // rotate mode
        this.toggleTransformMode(); // Toggle between rotate and translate
      } else if (event.altKey && event.key === 't') { // scale mode
        if (this.currentMode === 'scale') {
          // If already in scale mode, toggle back to the previous mode
          this.setTransformMode(this.previousTransformMode);
        } else {
          // Store the current mode and switch to scale mode
          this.previousTransformMode = this.currentMode;
          this.setTransformMode('scale');
        }
      }
    });

    document.getElementById('deleteButton').addEventListener('click', () => {
      this.deleteSelectedEntity();
    });
  }

  addTransformIconListeners() {
    // Translate Icon
    document.getElementById('translateIcon').addEventListener('click', () => {
      this.setTransformMode('translate');
    });

    // Rotate Icon
    document.getElementById('rotateIcon').addEventListener('click', () => {
      this.setTransformMode('rotate');
    });

    // Scale Icon
    document.getElementById('scaleIcon').addEventListener('click', () => {
      this.setTransformMode('scale');
    });
  }

  addAlignmentIconListeners() {
    // Add event listeners to alignment icons
    document.querySelectorAll('.align-icon').forEach(icon => {
      icon.addEventListener('click', () => {
        // Remove active class from all icons
        document.querySelectorAll('.align-icon').forEach(i => i.classList.remove('active'));

        // Add active class to the clicked icon
        icon.classList.add('active');

        // Get the selected alignment value
        const selectedAlignment = icon.getAttribute('data-value');
        console.log('Selected Alignment:', selectedAlignment);

        // Update the align-input value
        document.getElementById('align-input').value = selectedAlignment;

        // Update the selected tooltip
        this.updateSelectedTooltip();
      });
    });
  }

  addColorPickerListener() {
    const colorPickerIcon = document.getElementById('color-picker-icon');
    const colorInput = document.getElementById('color-input');

    if (colorPickerIcon && colorInput) {
      // Trigger the color picker when the icon is clicked
      colorPickerIcon.addEventListener('click', () => {
        colorInput.click();
      });

      // Update the tooltip color when the color input changes
      colorInput.addEventListener('input', () => {
        this.updateSelectedTooltip();
      });
    }
  }

  addTooltipEventListeners() {
    const tooltipInputs = [
      'tooltip-input', 'align-input', 'color-input',
      'fill-opacity-input', 'font-input', 'font-size-input',
      'letter-spacing-input', 'line-height-input', 'max-width-input'
    ];

    tooltipInputs.forEach(inputId => {
      const input = document.getElementById(inputId);
      if (input) {
        input.addEventListener('input', () => this.updateSelectedTooltip());
      }
    });
  }

  updateSelectedTooltip() {
    if (this.selectEntity && this.selectEntity.el) {
      const tooltipText = document.getElementById("tooltip-input").value;
      const align = document.getElementById("align-input").value;
      const color = document.getElementById("color-input").value;

      const fillOpacity = document.getElementById("fill-opacity-input").value;
      const font = document.getElementById("font-input").value;
      const fontSize = document.getElementById("font-size-input").value;
      const letterSpacing = document.getElementById("letter-spacing-input").value;
      const lineHeight = document.getElementById("line-height-input").value;
      const maxWidth = document.getElementById("max-width-input").value;

      // Update the selected tooltip's attributes
      const tooltip = this.selectEntity.el;
      tooltip.setAttribute('value', tooltipText);
      tooltip.setAttribute('align', align);
      tooltip.setAttribute('color', color); // Ensure color is updated

      tooltip.setAttribute('fill-opacity', fillOpacity);
      tooltip.setAttribute('font', font);
      tooltip.setAttribute('font-size', fontSize);
      tooltip.setAttribute('letter-spacing', letterSpacing);
      tooltip.setAttribute('line-height', lineHeight);
      tooltip.setAttribute('max-width', maxWidth);
    }
  }

  setSelectEntity(entity) {
    this.selectEntity = entity;
    this.updateTooltipUI();
  }

  updateTooltipUI() {
    if (this.selectEntity && this.selectEntity.el) {
      const tooltip = this.selectEntity.el;

      document.getElementById("tooltip-input").value = tooltip.getAttribute('value') || '';
      document.getElementById("align-input").value = tooltip.getAttribute('align') || '';
      document.getElementById("color-input").value = tooltip.getAttribute('color') || '#ffffff'; // Default to white if no color is set

      document.getElementById("fill-opacity-input").value = tooltip.getAttribute('fill-opacity') || '';
      document.getElementById("font-input").value = tooltip.getAttribute('font') || '';
      document.getElementById("font-size-input").value = tooltip.getAttribute('font-size') || '';
      document.getElementById("letter-spacing-input").value = tooltip.getAttribute('letter-spacing') || '';
      document.getElementById("line-height-input").value = tooltip.getAttribute('line-height') || '';
      document.getElementById("max-width-input").value = tooltip.getAttribute('max-width') || '';
    } else {
      // Clear the input fields if no tooltip is selected
      const tooltipInputs = [
        'tooltip-input', 'align-input', 'color-input',
        'fill-opacity-input', 'font-input', 'font-size-input',
        'letter-spacing-input', 'line-height-input', 'max-width-input'
      ];

      tooltipInputs.forEach(inputId => {
        const input = document.getElementById(inputId);
        if (input) {
          input.value = '';
        }
      });
    }
  }


  toggleTransformMode() {
    if (this.viewport) {
      if (this.currentMode === 'translate') {
        this.viewport.setTransformMode('rotate');
        this.currentMode = 'rotate';
      } else {
        this.viewport.setTransformMode('translate');
        this.currentMode = 'translate';
      }
    }
  }

  // Method to set a specific transform mode
  setTransformMode(mode) {
    if (this.viewport) {
      this.viewport.setTransformMode(mode);
      this.currentMode = mode; // Update the current mode
    }
  }


  deleteSelectedEntity() {
    if (this.selectEntity) {
      // Get the A-Frame entity associated with the selected Object3D
      const aframeEntity = this.selectEntity.el;

      if (aframeEntity) {
        // Remove the A-Frame entity from the DOM
        aframeEntity.parentNode.removeChild(aframeEntity);
      }

      // Remove the entity from the entities array
      const index = this.entities.indexOf(this.selectEntity);
      if (index !== -1) {
        this.entities.splice(index, 1);
      }

      // Clear the selected entity
      this.selectEntity = null;

      // Optionally, hide the transform controls and selection box
      if (this.viewport) {
        this.viewport.transformControls.visible = false;
        this.viewport.selectionBox.visible = false;
      }

      console.log("Selected entity deleted.");
    } else {
      console.log("No entity selected to delete.");
    }
  }

  createCamera() {
    // Get all existing cameras with the class "myCam"
    const existingCameras = document.querySelectorAll('.myCam');
  
    // If there are already 2 cameras, remove the first one
    if (existingCameras.length >= 1) {
      const firstCamera = existingCameras[0];
      firstCamera.parentNode.removeChild(firstCamera); // Remove the first camera
      //console.log("Removed the oldest camera to maintain a limit of 2 cameras.");
    }
  
    // Create the new camera entity
    this.cameraEl = document.createElement("a-entity");
    this.cameraEl.classList.add("myCam"); // Add the class "myCam"
    this.cameraEl.setAttribute("camera", {
      far: 1000,
      fov: 75,
      near: 0.01,
      active: true,
    });
    this.cameraEl.addEventListener("loaded", () => {
      this.camera = this.cameraEl.getObject3D("camera");
      this.initCamera();
  
      this.viewport = new Viewport(this);
    });
    this.sceneEl.appendChild(this.cameraEl);
  }

  createHelper() {
    this.sceneHelpers = new THREE.Scene();
    this.sceneHelpers.visible = true; //false;

    this.scene.add(this.sceneHelpers);
  }

  initCamera() {
    this.camera.position.set(5, 5, 5);
    this.camera.lookAt(new THREE.Vector3());
    this.camera.updateMatrixWorld();
  }

  initEntities() {
    this.scene.children.forEach((entity) => {
      if (entity.el) {
        // Exclude the grid entity from the list of selectable entities
        if (entity.el.tagName !== "A-SKY" && entity.el.tagName !== "A-GRID") {
          entity.children.forEach((_obj, j) => {
            this.entities.push(entity.children[j]);
          });
        }
      }
    });
  }

  removeHelper(object) {}

  setSelectEntity(entity) {
    this.selectEntity = entity;
  }

  initEvents() {}

  selectById(id) {}

  createNewEntity(definition) {}

  addEntity(entity) {
    var entity = document.createElement("a-entity");

    //for (var attr in definition.components) {
    //	entity.setAttribute(attr, definition.components[attr]);
    //}

    entity.setAttribute("geometry", "primitive:box");
    entity.setAttribute("material", "color:#f00");
    entity.setAttribute("position", "-5 2 0");

    this.sceneEl.appendChild(entity);

    entity.object3D.traverse((child) => {
      this.entities.push(child);
    });

    console.log(entity.object3D);

    return entity;
  }

  rodationYChange(y) {
    if (this.selectEntity) {
      this.selectEntity.rotation.y = THREE.Math.degToRad(y);
    }
  }

  rodationXChange(x) {
    if (this.selectEntity) {
      this.selectEntity.rotation.x = THREE.Math.degToRad(x);

      this.viewport.selectionBox.setFromObject(this.selectEntity).update();
    }
  }

  widthChange(size) {
    if (this.selectEntity) {
      this.selectEntity.scale.set(
        size,
        this.selectEntity.scale.y,
        this.selectEntity.scale.z
      );

      this.viewport.selectionBox.setFromObject(this.selectEntity).update();
    }
  }

  heightChange(size) {
    if (this.selectEntity) {
      this.selectEntity.scale.set(
        this.selectEntity.scale.x,
        size,
        this.selectEntity.scale.z
      );

      this.viewport.selectionBox.setFromObject(this.selectEntity).update();
    }
  }
}

class Viewport {
  constructor(editor) {
    this.editor = editor;
    this.canvasEl = document.querySelector(".a-canvas");
    this.camera = editor.camera;

    this.onDownPosition = new THREE.Vector2();
    this.onUpPosition = new THREE.Vector2();

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.createEditorControls();
    this.createTransformControls();
    this.createSelectionBox();

    this.initEvent();
  }

  setTransformMode(mode) {
    if (this.transformControls) {
      this.transformControls.setMode(mode);
    }
  }

  initEvent() {
    const handleLeftClick = (event) => {
      if (this.onDownPosition.distanceTo(this.onUpPosition) === 0) {
        const intersects = this.getIntersects(
          this.onUpPosition,
          this.editor.entities
        );
        if (intersects.length > 0) {
          const object = intersects[0].object;
          this.setSelectEntity(object);
        } else {
          this.setSelectEntity(null);
          this.transformControls.visible = false;
        }
      }
    };

    // const handleRightClick = (event) => {
    //   if (this.onDownPosition.distanceTo(this.onUpPosition) === 0) {
    //     const intersects = this.getIntersects(
    //       this.onUpPosition,
    //       this.editor.entities
    //     );
    //     if (intersects.length > 0) {
    //       const object = intersects[0].object;
    //     }
    //   }
    // };
    

    const onStartEvent = (event) => {
      if (!event.changedTouches) {
        const array = this.getMousePosition(
          this.canvasEl,
          event.clientX,
          event.clientY
        );
        this.onDownPosition.fromArray(array);
      } else {
        const touch = event.changedTouches[0];
        const array = this.getMousePosition(
          this.canvasEl,
          touch.clientX,
          touch.clientY
        );
        this.onDownPosition.fromArray(array);
      }

      document.addEventListener(ENDEVENT, onEndEvent, false);
    };

    const onEndEvent = (event) => {
      if (!event.changedTouches) {
        const array = this.getMousePosition(
          this.canvasEl,
          event.clientX,
          event.clientY
        );
        this.onUpPosition.fromArray(array);
      } else {
        const touch = event.changedTouches[0];
        const array = this.getMousePosition(
          this.canvasEl,
          touch.clientX,
          touch.clientY
        );
        this.onUpPosition.fromArray(array);
      }

      if (event.button === 0) {
        handleLeftClick(event);
      }
      // else if (event.button === 2) {
      //   handleRightClick(event);
      // }

      document.removeEventListener(ENDEVENT, onEndEvent, false);
    };

    this.canvasEl.addEventListener(STARTEVENT, onStartEvent, false);
  }

  setSelectEntity(entity) {
    if (!entity) {
      this.selectionBox.visible = false;

      this.editor.setSelectEntity(entity);
    } else {
      this.transformControls.detach();

      if (entity && entity.el) {
        if (entity.el.tagName !== "A-SKY") {
          if (entity.el.getObject3D("mesh")) {
            this.selectionBox.setFromObject(entity).update();
            this.selectionBox.visible = true;
          }

          this.transformControls.attach(entity);

          this.editor.setSelectEntity(entity);
        }
      }
    }
  }

  createSelectionBox() {
    this.selectionBox = new THREE.BoxHelper();
    this.selectionBox.material.depthTest = false;
    this.selectionBox.material.transparent = true;
    this.selectionBox.material.color.set(0x1faaf2);
    this.selectionBox.visible = false;

    this.editor.scene.add(this.selectionBox);

    window.setTimeout(() => {}, 3000);
  }

  createEditorControls() {
    //canvas zoom & drag
    this.editorControls = new THREE.EditorControls(this.camera, this.canvasEl);
  }

  createTransformControls() {
    this.transformControls = new TransformControls(this.camera, this.canvasEl);
    console.log(this.transformControls);
    this.transformControls.size = 0.75;
    this.transformControls.addEventListener("objectChange", (evt) => {
      const object = this.transformControls.object;
      if (!object) {
        return;
      }

      //console.log(evt, object);

      // Dispatch customEvent position
      // document.dispatchEvent(
      //   new CustomEvent("objectPositionUpdate", {
      //     detail: {
      //       x: object.position.x,
      //       y: object.position.y,
      //       z: object.position.z,
      //       id: object.id,
      //     },
      //   })
      // );

      this.selectionBox.setFromObject(object).update();
    });

    this.transformControls.addEventListener("mouseDown", () => {
      this.editorControls.enabled = false;

      this.setSelectEntity(null);
    });

    this.transformControls.addEventListener("mouseUp", () => {
      this.editorControls.enabled = true;
    });

    this.editor.scene.add(this.transformControls);
  }

  getMousePosition(dom, x, y) {
    const rect = dom.getBoundingClientRect();
    return [(x - rect.left) / rect.width, (y - rect.top) / rect.height];
  }

  getIntersects(point) {
    this.mouse.set(point.x * 2 - 1, -(point.y * 2) + 1);
    this.raycaster.setFromCamera(this.mouse, this.camera);
    return this.raycaster.intersectObjects(this.editor.entities, true);
  }

  setRotation() {
    const object = this.transformControls.object;
    //object.rotation.y = THREE.Math.degToRad( 90 );
    window.obj = object;
  }
}

THREE.Box3.prototype.expandByObject = (function () {
  // Computes the world-axis-aligned bounding box of an object (including its children),
  // accounting for both the object's, and children's, world transforms

  var scope, i, l;

  var v1 = new THREE.Vector3();

  function traverse(node) {
    var geometry = node.geometry;

    if (geometry !== undefined) {
      if (geometry.isGeometry) {
        var vertices = geometry.vertices;

        for (i = 0, l = vertices.length; i < l; i++) {
          v1.copy(vertices[i]);
          v1.applyMatrix4(node.matrixWorld);

          if (isNaN(v1.x) || isNaN(v1.y) || isNaN(v1.z)) {
            continue;
          }
          scope.expandByPoint(v1);
        }
      } else if (geometry.isBufferGeometry) {
        var attribute = geometry.attributes.position;

        if (attribute !== undefined) {
          for (i = 0, l = attribute.count; i < l; i++) {
            v1.fromBufferAttribute(attribute, i).applyMatrix4(node.matrixWorld);

            if (isNaN(v1.x) || isNaN(v1.y) || isNaN(v1.z)) {
              continue;
            }
            scope.expandByPoint(v1);
          }
        }
      }
    }
  }

  return function expandByObject(object) {
    scope = this;

    object.updateMatrixWorld(true);

    object.traverse(traverse);

    return this;
  };
})();

/**
 * @author qiao / https://github.com/qiao
 * @author mrdoob / http://mrdoob.com
 * @author alteredq / http://alteredqualia.com/
 * @author WestLangley / http://github.com/WestLangley
 */

THREE.EditorControls = function (_object, domElement) {
  domElement = domElement !== undefined ? domElement : document;

  // API

  this.enabled = true;
  this.center = new THREE.Vector3();
  this.panSpeed = 0.001;
  this.zoomSpeed = 0.1;
  this.rotationSpeed = 0.005;

  var object = _object;

  // internals

  var scope = this;
  var vector = new THREE.Vector3();
  var delta = new THREE.Vector3();
  var box = new THREE.Box3();

  var STATE = { NONE: -1, ROTATE: 0, ZOOM: 1, PAN: 2 };
  var state = STATE.NONE;

  var center = this.center;
  var normalMatrix = new THREE.Matrix3();
  var pointer = new THREE.Vector2();
  var pointerOld = new THREE.Vector2();
  var spherical = new THREE.Spherical();
  var sphere = new THREE.Sphere();

  this.isOrthographic = false;
  this.rotationEnabled = true;
  this.setCamera = function (_object) {
    object = _object;
    if (object.type === "OrthographicCamera") {
      this.rotationEnabled = false;
      this.isOrthographic = true;
    } else {
      this.rotationEnabled = true;
      this.isOrthographic = false;
    }
  };
  this.setCamera(_object);

  // events

  var changeEvent = { type: "change" };

  this.focus = function (target) {
    var distance;

    box.setFromObject(target);

    if (box.isEmpty() === false && !isNaN(box.min.x)) {
      box.getCenter(center);
      distance = box.getBoundingSphere(sphere).radius;
    } else {
      // Focusing on an Group, AmbientLight, etc

      center.setFromMatrixPosition(target.matrixWorld);
      distance = 0.1;
    }

    object.position.copy(
      target.localToWorld(new THREE.Vector3(0, 0, distance * 2))
    );
    object.lookAt(target.getWorldPosition(new THREE.Vector3()));
  };

  this.pan = function (delta) {
    var distance;
    if (this.isOrthographic) {
      distance = Math.abs(object.right);
    } else {
      distance = object.position.distanceTo(center);
    }

    delta.multiplyScalar(distance * scope.panSpeed);
    delta.applyMatrix3(normalMatrix.getNormalMatrix(object.matrix));

    object.position.add(delta);
    center.add(delta);
  };

  var ratio = 1;
  this.setAspectRatio = function (_ratio) {
    ratio = _ratio;
  };

  this.zoom = function (delta) {
    var distance = object.position.distanceTo(center);

    delta.multiplyScalar(distance * scope.zoomSpeed);

    if (delta.length() > distance) return;

    delta.applyMatrix3(normalMatrix.getNormalMatrix(object.matrix));

    if (this.isOrthographic) {
      // Change FOV for ortho.
      let factor = 1;
      if (delta.x + delta.y + delta.z < 0) {
        factor = -1;
      }
      delta = distance * scope.zoomSpeed * factor;
      object.left -= delta * ratio;
      object.bottom -= delta;
      object.right += delta * ratio;
      object.top += delta;
      if (object.left >= -0.0001) {
        return;
      }
      object.updateProjectionMatrix();
    } else {
      object.position.add(delta);
    }
  };

  this.rotate = function (delta) {
    if (!this.rotationEnabled) {
      return;
    }

    vector.copy(object.position).sub(center);

    spherical.setFromVector3(vector);

    spherical.theta += delta.x;
    spherical.phi += delta.y;

    spherical.makeSafe();

    vector.setFromSpherical(spherical);

    object.position.copy(center).add(vector);

    object.lookAt(center);
  };

  // mouse

  function onMouseDown(event) {
    if (scope.enabled === false) return;

    if (event.button === 0) {
      state = STATE.ROTATE;
    } else if (event.button === 1) {
      state = STATE.ZOOM;
    } else if (event.button === 2) {
      state = STATE.PAN;
    }

    pointerOld.set(event.clientX, event.clientY);

    domElement.addEventListener("mousemove", onMouseMove, false);
    domElement.addEventListener("mouseup", onMouseUp, false);
    domElement.addEventListener("mouseout", onMouseUp, false);
    domElement.addEventListener("dblclick", onMouseUp, false);
  }

  function onMouseMove(event) {
    if (scope.enabled === false) return;

    pointer.set(event.clientX, event.clientY);

    var movementX = pointer.x - pointerOld.x;
    var movementY = pointer.y - pointerOld.y;

    if (state === STATE.ROTATE) {
      scope.rotate(
        delta.set(
          -movementX * scope.rotationSpeed,
          -movementY * scope.rotationSpeed,
          0
        )
      );
    } else if (state === STATE.ZOOM) {
      scope.zoom(delta.set(0, 0, movementY));
    } else if (state === STATE.PAN) {
      scope.pan(delta.set(-movementX, movementY, 0));
    }

    pointerOld.set(event.clientX, event.clientY);
  }

  function onMouseUp(event) {
    domElement.removeEventListener("mousemove", onMouseMove, false);
    domElement.removeEventListener("mouseup", onMouseUp, false);
    domElement.removeEventListener("mouseout", onMouseUp, false);
    domElement.removeEventListener("dblclick", onMouseUp, false);

    state = STATE.NONE;
  }

  function onMouseWheel(event) {
    event.preventDefault();

    // Normalize deltaY due to https://bugzilla.mozilla.org/show_bug.cgi?id=1392460
    scope.zoom(delta.set(0, 0, event.deltaY > 0 ? 1 : -1));
  }

  function contextmenu(event) {
    event.preventDefault();
  }

  this.dispose = function () {
    domElement.removeEventListener("contextmenu", contextmenu, false);
    domElement.removeEventListener("mousedown", onMouseDown, false);
    domElement.removeEventListener("wheel", onMouseWheel, false);

    domElement.removeEventListener("mousemove", onMouseMove, false);
    domElement.removeEventListener("mouseup", onMouseUp, false);
    domElement.removeEventListener("mouseout", onMouseUp, false);
    domElement.removeEventListener("dblclick", onMouseUp, false);

    domElement.removeEventListener("touchstart", touchStart, false);
    domElement.removeEventListener("touchmove", touchMove, false);
  };

  domElement.addEventListener("contextmenu", contextmenu, false);
  domElement.addEventListener("mousedown", onMouseDown, false);
  domElement.addEventListener("wheel", onMouseWheel, { passive: false });

  // touch

  var touches = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  var prevTouches = [
    new THREE.Vector3(),
    new THREE.Vector3(),
    new THREE.Vector3(),
  ];

  var prevDistance = null;

  function touchStart(event) {
    if (scope.enabled === false) return;

    switch (event.touches.length) {
      case 1:
        touches[0].set(event.touches[0].pageX, event.touches[0].pageY, 0);
        touches[1].set(event.touches[0].pageX, event.touches[0].pageY, 0);
        break;

      case 2:
        touches[0].set(event.touches[0].pageX, event.touches[0].pageY, 0);
        touches[1].set(event.touches[1].pageX, event.touches[1].pageY, 0);
        prevDistance = touches[0].distanceTo(touches[1]);
        break;
    }

    prevTouches[0].copy(touches[0]);
    prevTouches[1].copy(touches[1]);
  }

  function touchMove(event) {
    if (scope.enabled === false) return;

    event.preventDefault();
    event.stopPropagation();

    function getClosest(touch, touches) {
      var closest = touches[0];

      for (var i in touches) {
        if (closest.distanceTo(touch) > touches[i].distanceTo(touch))
          closest = touches[i];
      }

      return closest;
    }

    switch (event.touches.length) {
      case 1:
        touches[0].set(event.touches[0].pageX, event.touches[0].pageY, 0);
        touches[1].set(event.touches[0].pageX, event.touches[0].pageY, 0);
        scope.rotate(
          touches[0]
            .sub(getClosest(touches[0], prevTouches))
            .multiplyScalar(-scope.rotationSpeed)
        );
        break;

      case 2:
        touches[0].set(event.touches[0].pageX, event.touches[0].pageY, 0);
        touches[1].set(event.touches[1].pageX, event.touches[1].pageY, 0);
        var distance = touches[0].distanceTo(touches[1]);
        scope.zoom(delta.set(0, 0, prevDistance - distance));
        prevDistance = distance;

        var offset0 = touches[0]
          .clone()
          .sub(getClosest(touches[0], prevTouches));
        var offset1 = touches[1]
          .clone()
          .sub(getClosest(touches[1], prevTouches));
        offset0.x = -offset0.x;
        offset1.x = -offset1.x;

        scope.pan(offset0.add(offset1).multiplyScalar(0.5));

        break;
    }

    prevTouches[0].copy(touches[0]);
    prevTouches[1].copy(touches[1]);
  }

  domElement.addEventListener("touchstart", touchStart, false);
  domElement.addEventListener("touchmove", touchMove, false);
};

THREE.EditorControls.prototype = Object.create(THREE.EventDispatcher.prototype);
THREE.EditorControls.prototype.constructor = THREE.EditorControls;

const _raycaster = new THREE.Raycaster();

const _tempVector = new THREE.Vector3();
const _tempVector2 = new THREE.Vector3();
const _tempQuaternion = new THREE.Quaternion();
const _unit = {
  X: new THREE.Vector3(1, 0, 0),
  Y: new THREE.Vector3(0, 1, 0),
  Z: new THREE.Vector3(0, 0, 1),
};

const _changeEvent = { type: "change" };
const _mouseDownEvent = { type: "mouseDown" };
const _mouseUpEvent = { type: "mouseUp", mode: null };
const _objectChangeEvent = { type: "objectChange" };

class TransformControls extends THREE.Object3D {
  constructor(camera, domElement) {
    super();

    if (domElement === undefined) {
      console.warn(
        'THREE.TransformControls: The second parameter "domElement" is now mandatory.'
      );
      domElement = document;
    }

    this.visible = false;
    this.domElement = domElement;
    this.domElement.style.touchAction = "none"; // disable touch scroll

    const _gizmo = new TransformControlsGizmo();
    this._gizmo = _gizmo;
    this.add(_gizmo);

    const _plane = new TransformControlsPlane();
    this._plane = _plane;
    this.add(_plane);

    const scope = this;

    // Defined getter, setter and store for a property
    function defineProperty(propName, defaultValue) {
      let propValue = defaultValue;

      Object.defineProperty(scope, propName, {
        get: function () {
          return propValue !== undefined ? propValue : defaultValue;
        },

        set: function (value) {
          if (propValue !== value) {
            propValue = value;
            _plane[propName] = value;
            _gizmo[propName] = value;

            scope.dispatchEvent({ type: propName + "-changed", value: value });
            scope.dispatchEvent(_changeEvent);
          }
        },
      });

      scope[propName] = defaultValue;
      _plane[propName] = defaultValue;
      _gizmo[propName] = defaultValue;
    }

    // Define properties with getters/setter
    // Setting the defined property will automatically trigger change event
    // Defined properties are passed down to gizmo and plane

    defineProperty("camera", camera);
    defineProperty("object", undefined);
    defineProperty("enabled", true);
    defineProperty("axis", null);
    defineProperty("mode", "translate");
    defineProperty("translationSnap", null);
    defineProperty("rotationSnap", null);
    defineProperty("scaleSnap", null);
    defineProperty("space", "world");
    defineProperty("size", 1);
    defineProperty("dragging", false);
    defineProperty("showX", true);
    defineProperty("showY", true);
    defineProperty("showZ", true);

    // Reusable utility variables

    const worldPosition = new THREE.Vector3();
    const worldPositionStart = new THREE.Vector3();
    const worldQuaternion = new THREE.Quaternion();
    const worldQuaternionStart = new THREE.Quaternion();
    const cameraPosition = new THREE.Vector3();
    const cameraQuaternion = new THREE.Quaternion();
    const pointStart = new THREE.Vector3();
    const pointEnd = new THREE.Vector3();
    const rotationAxis = new THREE.Vector3();
    const rotationAngle = 0;
    const eye = new THREE.Vector3();

    // TODO: remove properties unused in plane and gizmo

    defineProperty("worldPosition", worldPosition);
    defineProperty("worldPositionStart", worldPositionStart);
    defineProperty("worldQuaternion", worldQuaternion);
    defineProperty("worldQuaternionStart", worldQuaternionStart);
    defineProperty("cameraPosition", cameraPosition);
    defineProperty("cameraQuaternion", cameraQuaternion);
    defineProperty("pointStart", pointStart);
    defineProperty("pointEnd", pointEnd);
    defineProperty("rotationAxis", rotationAxis);
    defineProperty("rotationAngle", rotationAngle);
    defineProperty("eye", eye);

    this._offset = new THREE.Vector3();
    this._startNorm = new THREE.Vector3();
    this._endNorm = new THREE.Vector3();
    this._cameraScale = new THREE.Vector3();

    this._parentPosition = new THREE.Vector3();
    this._parentQuaternion = new THREE.Quaternion();
    this._parentQuaternionInv = new THREE.Quaternion();
    this._parentScale = new THREE.Vector3();

    this._worldScaleStart = new THREE.Vector3();
    this._worldQuaternionInv = new THREE.Quaternion();
    this._worldScale = new THREE.Vector3();

    this._positionStart = new THREE.Vector3();
    this._quaternionStart = new THREE.Quaternion();
    this._scaleStart = new THREE.Vector3();

    this._getPointer = getPointer.bind(this);
    this._onPointerDown = onPointerDown.bind(this);
    this._onPointerHover = onPointerHover.bind(this);
    this._onPointerMove = onPointerMove.bind(this);
    this._onPointerUp = onPointerUp.bind(this);

    this.domElement.addEventListener("pointerdown", this._onPointerDown);
    this.domElement.addEventListener("pointermove", this._onPointerHover);
    this.domElement.addEventListener("pointerup", this._onPointerUp);
  }

  // updateMatrixWorld  updates key transformation variables
  updateMatrixWorld() {
    if (this.object !== undefined) {
      this.object.updateMatrixWorld();

      if (this.object.parent === null) {
        console.error(
          "TransformControls: The attached 3D object must be a part of the scene graph."
        );
      } else {
        this.object.parent.matrixWorld.decompose(
          this._parentPosition,
          this._parentQuaternion,
          this._parentScale
        );
      }

      this.object.matrixWorld.decompose(
        this.worldPosition,
        this.worldQuaternion,
        this._worldScale
      );

      this._parentQuaternionInv.copy(this._parentQuaternion).invert();
      this._worldQuaternionInv.copy(this.worldQuaternion).invert();
    }

    this.camera.updateMatrixWorld();
    this.camera.matrixWorld.decompose(
      this.cameraPosition,
      this.cameraQuaternion,
      this._cameraScale
    );

    this.eye.copy(this.cameraPosition).sub(this.worldPosition).normalize();

    super.updateMatrixWorld(this);
  }

  pointerHover(pointer) {
    if (this.object === undefined || this.dragging === true) return;

    _raycaster.setFromCamera(pointer, this.camera);

    const intersect = intersectObjectWithRay(
      this._gizmo.picker[this.mode],
      _raycaster
    );

    if (intersect) {
      this.axis = intersect.object.name;
    } else {
      this.axis = null;
    }
  }

  pointerDown(pointer) {
    if (
      this.object === undefined ||
      this.dragging === true ||
      pointer.button !== 0
    )
      return;

    if (this.axis !== null) {
      _raycaster.setFromCamera(pointer, this.camera);

      const planeIntersect = intersectObjectWithRay(
        this._plane,
        _raycaster,
        true
      );

      if (planeIntersect) {
        let space = this.space;

        if (this.mode === "scale") {
          space = "local";
        } else if (
          this.axis === "E" ||
          this.axis === "XYZE" ||
          this.axis === "XYZ"
        ) {
          space = "world";
        }

        if (space === "local" && this.mode === "rotate") {
          const snap = this.rotationSnap;

          if (this.axis === "X" && snap)
            this.object.rotation.x =
              Math.round(this.object.rotation.x / snap) * snap;
          if (this.axis === "Y" && snap)
            this.object.rotation.y =
              Math.round(this.object.rotation.y / snap) * snap;
          if (this.axis === "Z" && snap)
            this.object.rotation.z =
              Math.round(this.object.rotation.z / snap) * snap;
        }

        this.object.updateMatrixWorld();
        this.object.parent.updateMatrixWorld();

        this._positionStart.copy(this.object.position);
        this._quaternionStart.copy(this.object.quaternion);
        this._scaleStart.copy(this.object.scale);

        this.object.matrixWorld.decompose(
          this.worldPositionStart,
          this.worldQuaternionStart,
          this._worldScaleStart
        );

        this.pointStart.copy(planeIntersect.point).sub(this.worldPositionStart);
      }

      this.dragging = true;
      _mouseDownEvent.mode = this.mode;
      this.dispatchEvent(_mouseDownEvent);
    }
  }

  pointerMove(pointer) {
    const axis = this.axis;
    const mode = this.mode;
    const object = this.object;
    let space = this.space;

    if (mode === "scale") {
      space = "local";
    } else if (axis === "E" || axis === "XYZE" || axis === "XYZ") {
      space = "world";
    }

    if (
      object === undefined ||
      axis === null ||
      this.dragging === false ||
      pointer.button !== -1
    )
      return;

    _raycaster.setFromCamera(pointer, this.camera);

    const planeIntersect = intersectObjectWithRay(
      this._plane,
      _raycaster,
      true
    );

    if (!planeIntersect) return;

    this.pointEnd.copy(planeIntersect.point).sub(this.worldPositionStart);

    if (mode === "translate") {
      // Apply translate

      this._offset.copy(this.pointEnd).sub(this.pointStart);

      if (space === "local" && axis !== "XYZ") {
        this._offset.applyQuaternion(this._worldQuaternionInv);
      }

      if (axis.indexOf("X") === -1) this._offset.x = 0;
      if (axis.indexOf("Y") === -1) this._offset.y = 0;
      if (axis.indexOf("Z") === -1) this._offset.z = 0;

      if (space === "local" && axis !== "XYZ") {
        this._offset
          .applyQuaternion(this._quaternionStart)
          .divide(this._parentScale);
      } else {
        this._offset
          .applyQuaternion(this._parentQuaternionInv)
          .divide(this._parentScale);
      }

      object.position.copy(this._offset).add(this._positionStart);

      // Apply translation snap

      if (this.translationSnap) {
        if (space === "local") {
          object.position.applyQuaternion(
            _tempQuaternion.copy(this._quaternionStart).invert()
          );

          if (axis.search("X") !== -1) {
            object.position.x =
              Math.round(object.position.x / this.translationSnap) *
              this.translationSnap;
          }

          if (axis.search("Y") !== -1) {
            object.position.y =
              Math.round(object.position.y / this.translationSnap) *
              this.translationSnap;
          }

          if (axis.search("Z") !== -1) {
            object.position.z =
              Math.round(object.position.z / this.translationSnap) *
              this.translationSnap;
          }

          object.position.applyQuaternion(this._quaternionStart);
        }

        if (space === "world") {
          if (object.parent) {
            object.position.add(
              _tempVector.setFromMatrixPosition(object.parent.matrixWorld)
            );
          }

          if (axis.search("X") !== -1) {
            object.position.x =
              Math.round(object.position.x / this.translationSnap) *
              this.translationSnap;
          }

          if (axis.search("Y") !== -1) {
            object.position.y =
              Math.round(object.position.y / this.translationSnap) *
              this.translationSnap;
          }

          if (axis.search("Z") !== -1) {
            object.position.z =
              Math.round(object.position.z / this.translationSnap) *
              this.translationSnap;
          }

          if (object.parent) {
            object.position.sub(
              _tempVector.setFromMatrixPosition(object.parent.matrixWorld)
            );
          }
        }
      }
    } else if (mode === "scale") {
      if (axis.search("XYZ") !== -1) {
        let d = this.pointEnd.length() / this.pointStart.length();

        if (this.pointEnd.dot(this.pointStart) < 0) d *= -1;

        _tempVector2.set(d, d, d);
      } else {
        _tempVector.copy(this.pointStart);
        _tempVector2.copy(this.pointEnd);

        _tempVector.applyQuaternion(this._worldQuaternionInv);
        _tempVector2.applyQuaternion(this._worldQuaternionInv);

        _tempVector2.divide(_tempVector);

        if (axis.search("X") === -1) {
          _tempVector2.x = 1;
        }

        if (axis.search("Y") === -1) {
          _tempVector2.y = 1;
        }

        if (axis.search("Z") === -1) {
          _tempVector2.z = 1;
        }
      }

      // Apply scale

      object.scale.copy(this._scaleStart).multiply(_tempVector2);

      if (this.scaleSnap) {
        if (axis.search("X") !== -1) {
          object.scale.x =
            Math.round(object.scale.x / this.scaleSnap) * this.scaleSnap ||
            this.scaleSnap;
        }

        if (axis.search("Y") !== -1) {
          object.scale.y =
            Math.round(object.scale.y / this.scaleSnap) * this.scaleSnap ||
            this.scaleSnap;
        }

        if (axis.search("Z") !== -1) {
          object.scale.z =
            Math.round(object.scale.z / this.scaleSnap) * this.scaleSnap ||
            this.scaleSnap;
        }
      }
    } else if (mode === "rotate") {
      this._offset.copy(this.pointEnd).sub(this.pointStart);

      const ROTATION_SPEED =
        20 /
        this.worldPosition.distanceTo(
          _tempVector.setFromMatrixPosition(this.camera.matrixWorld)
        );

      if (axis === "E") {
        this.rotationAxis.copy(this.eye);
        this.rotationAngle = this.pointEnd.angleTo(this.pointStart);

        this._startNorm.copy(this.pointStart).normalize();
        this._endNorm.copy(this.pointEnd).normalize();

        this.rotationAngle *=
          this._endNorm.cross(this._startNorm).dot(this.eye) < 0 ? 1 : -1;
      } else if (axis === "XYZE") {
        this.rotationAxis.copy(this._offset).cross(this.eye).normalize();
        this.rotationAngle =
          this._offset.dot(
            _tempVector.copy(this.rotationAxis).cross(this.eye)
          ) * ROTATION_SPEED;
      } else if (axis === "X" || axis === "Y" || axis === "Z") {
        this.rotationAxis.copy(_unit[axis]);

        _tempVector.copy(_unit[axis]);

        if (space === "local") {
          _tempVector.applyQuaternion(this.worldQuaternion);
        }

        this.rotationAngle =
          this._offset.dot(_tempVector.cross(this.eye).normalize()) *
          ROTATION_SPEED;
      }

      // Apply rotation snap

      if (this.rotationSnap)
        this.rotationAngle =
          Math.round(this.rotationAngle / this.rotationSnap) *
          this.rotationSnap;

      // Apply rotate
      if (space === "local" && axis !== "E" && axis !== "XYZE") {
        object.quaternion.copy(this._quaternionStart);
        object.quaternion
          .multiply(
            _tempQuaternion.setFromAxisAngle(
              this.rotationAxis,
              this.rotationAngle
            )
          )
          .normalize();
      } else {
        this.rotationAxis.applyQuaternion(this._parentQuaternionInv);
        object.quaternion.copy(
          _tempQuaternion.setFromAxisAngle(
            this.rotationAxis,
            this.rotationAngle
          )
        );
        object.quaternion.multiply(this._quaternionStart).normalize();
      }
    }

    this.dispatchEvent(_changeEvent);
    this.dispatchEvent(_objectChangeEvent);
  }

  pointerUp(pointer) {
    if (pointer.button !== 0) return;

    if (this.dragging && this.axis !== null) {
      _mouseUpEvent.mode = this.mode;
      this.dispatchEvent(_mouseUpEvent);
    }

    this.dragging = false;
    this.axis = null;
  }

  dispose() {
    this.domElement.removeEventListener("pointerdown", this._onPointerDown);
    this.domElement.removeEventListener("pointermove", this._onPointerHover);
    this.domElement.removeEventListener("pointermove", this._onPointerMove);
    this.domElement.removeEventListener("pointerup", this._onPointerUp);

    this.traverse(function (child) {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
  }

  // Set current object
  attach(object) {
    if (object.type != "Mesh") {
      object = object.el.getObject3D("mesh");
    }
    this.object = object;
    this.visible = true;

    return this;
  }

  // Detatch from object
  detach() {
    this.object = undefined;
    this.visible = false;
    this.axis = null;

    return this;
  }

  getRaycaster() {
    return _raycaster;
  }

  // TODO: deprecate

  getMode() {
    return this.mode;
  }

  setMode(mode) {
    this.mode = mode;
  }

  setTranslationSnap(translationSnap) {
    this.translationSnap = translationSnap;
  }

  setRotationSnap(rotationSnap) {
    this.rotationSnap = rotationSnap;
  }

  setScaleSnap(scaleSnap) {
    this.scaleSnap = scaleSnap;
  }

  setSize(size) {
    this.size = size;
  }

  setSpace(space) {
    this.space = space;
  }

  update() {
    console.warn(
      "THREE.TransformControls: update function has no more functionality and therefore has been deprecated."
    );
  }
}

TransformControls.prototype.isTransformControls = true;

// mouse / touch event handlers

function getPointer(event) {
  if (this.domElement.ownerDocument.pointerLockElement) {
    return {
      x: 0,
      y: 0,
      button: event.button,
    };
  } else {
    const rect = this.domElement.getBoundingClientRect();

    return {
      x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
      y: (-(event.clientY - rect.top) / rect.height) * 2 + 1,
      button: event.button,
    };
  }
}

function onPointerHover(event) {
  if (!this.enabled) return;

  switch (event.pointerType) {
    case "mouse":
    case "pen":
      this.pointerHover(this._getPointer(event));
      break;
  }
}

function onPointerDown(event) {
  if (!this.enabled) return;

  this.domElement.setPointerCapture(event.pointerId);

  this.domElement.addEventListener("pointermove", this._onPointerMove);

  this.pointerHover(this._getPointer(event));
  this.pointerDown(this._getPointer(event));
}

function onPointerMove(event) {
  if (!this.enabled) return;

  this.pointerMove(this._getPointer(event));
}

function onPointerUp(event) {
  if (!this.enabled) return;

  this.domElement.releasePointerCapture(event.pointerId);

  this.domElement.removeEventListener("pointermove", this._onPointerMove);

  this.pointerUp(this._getPointer(event));
}

function intersectObjectWithRay(object, raycaster, includeInvisible) {
  const allIntersections = raycaster.intersectObject(object, true);

  for (let i = 0; i < allIntersections.length; i++) {
    if (allIntersections[i].object.visible || includeInvisible) {
      return allIntersections[i];
    }
  }

  return false;
}

//

// Reusable utility variables

const _tempEuler = new THREE.Euler();
const _alignVector = new THREE.Vector3(0, 1, 0);
const _zeroVector = new THREE.Vector3(0, 0, 0);
const _lookAtMatrix = new THREE.Matrix4();
const _tempQuaternion2 = new THREE.Quaternion();
const _identityQuaternion = new THREE.Quaternion();
const _dirVector = new THREE.Vector3();
const _tempMatrix = new THREE.Matrix4();

const _unitX = new THREE.Vector3(1, 0, 0);
const _unitY = new THREE.Vector3(0, 1, 0);
const _unitZ = new THREE.Vector3(0, 0, 1);

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();

class TransformControlsGizmo extends THREE.Object3D {
  constructor() {
    super();

    this.type = "TransformControlsGizmo";

    // shared materials

    const gizmoMaterial = new THREE.MeshBasicMaterial({
      depthTest: false,
      depthWrite: false,
      fog: false,
      toneMapped: false,
      transparent: true,
      side: THREE.FrontSide
    });

    const gizmoLineMaterial = new THREE.LineBasicMaterial({
      depthTest: false,
      depthWrite: false,
      fog: false,
      toneMapped: false,
      transparent: true,
    });

    // Make unique material for each axis/color

    const matInvisible = gizmoMaterial.clone();
    matInvisible.opacity = 0.15;

    const matHelper = gizmoLineMaterial.clone();
    matHelper.opacity = 0.5;

    const matRed = gizmoMaterial.clone();
    matRed.color.setHex(0xff0000);

    const matGreen = gizmoMaterial.clone();
    matGreen.color.setHex(0x00ff00);

    const matBlue = gizmoMaterial.clone();
    matBlue.color.setHex(0x0000ff);

    const matRedTransparent = gizmoMaterial.clone();
    matRedTransparent.color.setHex(0xff0000);
    matRedTransparent.opacity = 0.5;

    const matGreenTransparent = gizmoMaterial.clone();
    matGreenTransparent.color.setHex(0x00ff00);
    matGreenTransparent.opacity = 0.5;

    const matBlueTransparent = gizmoMaterial.clone();
    matBlueTransparent.color.setHex(0x0000ff);
    matBlueTransparent.opacity = 0.5;

    const matWhiteTransparent = gizmoMaterial.clone();
    matWhiteTransparent.opacity = 0.25;

    const matYellowTransparent = gizmoMaterial.clone();
    matYellowTransparent.color.setHex(0xffff00);
    matYellowTransparent.opacity = 0.25;

    const matYellow = gizmoMaterial.clone();
    matYellow.color.setHex(0xffff00);

    const matGray = gizmoMaterial.clone();
    matGray.color.setHex(0x787878);

    // reusable geometry

    const arrowGeometry = new THREE.CylinderGeometry(0, 0.04, 0.1, 12);
    arrowGeometry.translate(0, 0.05, 0);

    const scaleHandleGeometry = new THREE.BoxGeometry(0.08, 0.08, 0.08);
    scaleHandleGeometry.translate(0, 0.04, 0);

    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0], 3)
    );

    const lineGeometry2 = new THREE.CylinderGeometry(0.0075, 0.0075, 0.5, 3);
    lineGeometry2.translate(0, 0.25, 0);

    function CircleGeometry(radius, arc) {
      const geometry = new THREE.TorusGeometry(
        radius,
        0.0075,
        3,
        64,
        arc * Math.PI * 2
      );
      geometry.rotateY(Math.PI / 2);
      geometry.rotateX(Math.PI / 2);
      return geometry;
    }

    // Special geometry for transform helper. If scaled with position vector it spans from [0,0,0] to position

    function TranslateHelperGeometry() {
      const geometry = new THREE.BufferGeometry();

      geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute([0, 0, 0, 1, 1, 1], 3)
      );

      return geometry;
    }

    // Gizmo definitions - custom hierarchy definitions for setupGizmo() function

    const gizmoTranslate = {
      X: [
        [
          new THREE.Mesh(arrowGeometry, matRed),
          [0.5, 0, 0],
          [0, 0, -Math.PI / 2],
        ],
        [
          new THREE.Mesh(arrowGeometry, matRed),
          [-0.5, 0, 0],
          [0, 0, Math.PI / 2],
        ],
        [
          new THREE.Mesh(lineGeometry2, matRed),
          [0, 0, 0],
          [0, 0, -Math.PI / 2],
        ],
      ],
      Y: [
        [new THREE.Mesh(arrowGeometry, matGreen), [0, 0.5, 0]],
        [
          new THREE.Mesh(arrowGeometry, matGreen),
          [0, -0.5, 0],
          [Math.PI, 0, 0],
        ],
        [new THREE.Mesh(lineGeometry2, matGreen)],
      ],
      Z: [
        [
          new THREE.Mesh(arrowGeometry, matBlue),
          [0, 0, 0.5],
          [Math.PI / 2, 0, 0],
        ],
        [
          new THREE.Mesh(arrowGeometry, matBlue),
          [0, 0, -0.5],
          [-Math.PI / 2, 0, 0],
        ],
        [new THREE.Mesh(lineGeometry2, matBlue), null, [Math.PI / 2, 0, 0]],
      ],
      XYZ: [
        [
          new THREE.Mesh(
            new THREE.OctahedronGeometry(0.1, 0),
            matWhiteTransparent.clone()
          ),
          [0, 0, 0],
        ],
      ],
      XY: [
        [
          new THREE.Mesh(
            new THREE.BoxGeometry(0.15, 0.15, 0.01),
            matBlueTransparent.clone()
          ),
          [0.15, 0.15, 0],
        ],
      ],
      YZ: [
        [
          new THREE.Mesh(
            new THREE.BoxGeometry(0.15, 0.15, 0.01),
            matRedTransparent.clone()
          ),
          [0, 0.15, 0.15],
          [0, Math.PI / 2, 0],
        ],
      ],
      XZ: [
        [
          new THREE.Mesh(
            new THREE.BoxGeometry(0.15, 0.15, 0.01),
            matGreenTransparent.clone()
          ),
          [0.15, 0, 0.15],
          [-Math.PI / 2, 0, 0],
        ],
      ],
    };

    const pickerTranslate = {
      X: [
        [
          new THREE.Mesh(
            new THREE.CylinderGeometry(0.2, 0, 0.6, 4),
            matInvisible
          ),
          [0.3, 0, 0],
          [0, 0, -Math.PI / 2],
        ],
        [
          new THREE.Mesh(
            new THREE.CylinderGeometry(0.2, 0, 0.6, 4),
            matInvisible
          ),
          [-0.3, 0, 0],
          [0, 0, Math.PI / 2],
        ],
      ],
      Y: [
        [
          new THREE.Mesh(
            new THREE.CylinderGeometry(0.2, 0, 0.6, 4),
            matInvisible
          ),
          [0, 0.3, 0],
        ],
        [
          new THREE.Mesh(
            new THREE.CylinderGeometry(0.2, 0, 0.6, 4),
            matInvisible
          ),
          [0, -0.3, 0],
          [0, 0, Math.PI],
        ],
      ],
      Z: [
        [
          new THREE.Mesh(
            new THREE.CylinderGeometry(0.2, 0, 0.6, 4),
            matInvisible
          ),
          [0, 0, 0.3],
          [Math.PI / 2, 0, 0],
        ],
        [
          new THREE.Mesh(
            new THREE.CylinderGeometry(0.2, 0, 0.6, 4),
            matInvisible
          ),
          [0, 0, -0.3],
          [-Math.PI / 2, 0, 0],
        ],
      ],
      XYZ: [
        [new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), matInvisible)],
      ],
      XY: [
        [
          new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.01), matInvisible),
          [0.15, 0.15, 0],
        ],
      ],
      YZ: [
        [
          new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.01), matInvisible),
          [0, 0.15, 0.15],
          [0, Math.PI / 2, 0],
        ],
      ],
      XZ: [
        [
          new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.01), matInvisible),
          [0.15, 0, 0.15],
          [-Math.PI / 2, 0, 0],
        ],
      ],
    };

    const helperTranslate = {
      START: [
        [
          new THREE.Mesh(new THREE.OctahedronGeometry(0.01, 2), matHelper),
          null,
          null,
          null,
          "helper",
        ],
      ],
      END: [
        [
          new THREE.Mesh(new THREE.OctahedronGeometry(0.01, 2), matHelper),
          null,
          null,
          null,
          "helper",
        ],
      ],
      DELTA: [
        [
          new THREE.Line(TranslateHelperGeometry(), matHelper),
          null,
          null,
          null,
          "helper",
        ],
      ],
      X: [
        [
          new THREE.Line(lineGeometry, matHelper.clone()),
          [-1e3, 0, 0],
          null,
          [1e6, 1, 1],
          "helper",
        ],
      ],
      Y: [
        [
          new THREE.Line(lineGeometry, matHelper.clone()),
          [0, -1e3, 0],
          [0, 0, Math.PI / 2],
          [1e6, 1, 1],
          "helper",
        ],
      ],
      Z: [
        [
          new THREE.Line(lineGeometry, matHelper.clone()),
          [0, 0, -1e3],
          [0, -Math.PI / 2, 0],
          [1e6, 1, 1],
          "helper",
        ],
      ],
    };

    const gizmoRotate = {
      XYZE: [
        [
          new THREE.Mesh(CircleGeometry(0.5, 1), matGray),
          null,
          [0, Math.PI / 2, 0],
        ],
      ],
      X: [[new THREE.Mesh(CircleGeometry(0.5, 0.5), matRed)]],
      Y: [
        [
          new THREE.Mesh(CircleGeometry(0.5, 0.5), matGreen),
          null,
          [0, 0, -Math.PI / 2],
        ],
      ],
      Z: [
        [
          new THREE.Mesh(CircleGeometry(0.5, 0.5), matBlue),
          null,
          [0, Math.PI / 2, 0],
        ],
      ],
      E: [
        [
          new THREE.Mesh(CircleGeometry(0.75, 1), matYellowTransparent),
          null,
          [0, Math.PI / 2, 0],
        ],
      ],
    };

    const helperRotate = {
      AXIS: [
        [
          new THREE.Line(lineGeometry, matHelper.clone()),
          [-1e3, 0, 0],
          null,
          [1e6, 1, 1],
          "helper",
        ],
      ],
    };

    const pickerRotate = {
      XYZE: [
        [new THREE.Mesh(new THREE.SphereGeometry(0.25, 10, 8), matInvisible)],
      ],
      X: [
        [
          new THREE.Mesh(
            new THREE.TorusGeometry(0.5, 0.1, 4, 24),
            matInvisible
          ),
          [0, 0, 0],
          [0, -Math.PI / 2, -Math.PI / 2],
        ],
      ],
      Y: [
        [
          new THREE.Mesh(
            new THREE.TorusGeometry(0.5, 0.1, 4, 24),
            matInvisible
          ),
          [0, 0, 0],
          [Math.PI / 2, 0, 0],
        ],
      ],
      Z: [
        [
          new THREE.Mesh(
            new THREE.TorusGeometry(0.5, 0.1, 4, 24),
            matInvisible
          ),
          [0, 0, 0],
          [0, 0, -Math.PI / 2],
        ],
      ],
      E: [
        [
          new THREE.Mesh(
            new THREE.TorusGeometry(0.75, 0.1, 2, 24),
            matInvisible
          ),
        ],
      ],
    };

    const gizmoScale = {
      X: [
        [
          new THREE.Mesh(scaleHandleGeometry, matRed),
          [0.5, 0, 0],
          [0, 0, -Math.PI / 2],
        ],
        [
          new THREE.Mesh(lineGeometry2, matRed),
          [0, 0, 0],
          [0, 0, -Math.PI / 2],
        ],
        [
          new THREE.Mesh(scaleHandleGeometry, matRed),
          [-0.5, 0, 0],
          [0, 0, Math.PI / 2],
        ],
      ],
      Y: [
        [new THREE.Mesh(scaleHandleGeometry, matGreen), [0, 0.5, 0]],
        [new THREE.Mesh(lineGeometry2, matGreen)],
        [
          new THREE.Mesh(scaleHandleGeometry, matGreen),
          [0, -0.5, 0],
          [0, 0, Math.PI],
        ],
      ],
      Z: [
        [
          new THREE.Mesh(scaleHandleGeometry, matBlue),
          [0, 0, 0.5],
          [Math.PI / 2, 0, 0],
        ],
        [
          new THREE.Mesh(lineGeometry2, matBlue),
          [0, 0, 0],
          [Math.PI / 2, 0, 0],
        ],
        [
          new THREE.Mesh(scaleHandleGeometry, matBlue),
          [0, 0, -0.5],
          [-Math.PI / 2, 0, 0],
        ],
      ],
      XY: [
        [
          new THREE.Mesh(
            new THREE.BoxGeometry(0.15, 0.15, 0.01),
            matBlueTransparent
          ),
          [0.15, 0.15, 0],
        ],
      ],
      YZ: [
        [
          new THREE.Mesh(
            new THREE.BoxGeometry(0.15, 0.15, 0.01),
            matRedTransparent
          ),
          [0, 0.15, 0.15],
          [0, Math.PI / 2, 0],
        ],
      ],
      XZ: [
        [
          new THREE.Mesh(
            new THREE.BoxGeometry(0.15, 0.15, 0.01),
            matGreenTransparent
          ),
          [0.15, 0, 0.15],
          [-Math.PI / 2, 0, 0],
        ],
      ],
      XYZ: [
        [
          new THREE.Mesh(
            new THREE.BoxGeometry(0.1, 0.1, 0.1),
            matWhiteTransparent.clone()
          ),
        ],
      ],
    };

    const pickerScale = {
      X: [
        [
          new THREE.Mesh(
            new THREE.CylinderGeometry(0.2, 0, 0.6, 4),
            matInvisible
          ),
          [0.3, 0, 0],
          [0, 0, -Math.PI / 2],
        ],
        [
          new THREE.Mesh(
            new THREE.CylinderGeometry(0.2, 0, 0.6, 4),
            matInvisible
          ),
          [-0.3, 0, 0],
          [0, 0, Math.PI / 2],
        ],
      ],
      Y: [
        [
          new THREE.Mesh(
            new THREE.CylinderGeometry(0.2, 0, 0.6, 4),
            matInvisible
          ),
          [0, 0.3, 0],
        ],
        [
          new THREE.Mesh(
            new THREE.CylinderGeometry(0.2, 0, 0.6, 4),
            matInvisible
          ),
          [0, -0.3, 0],
          [0, 0, Math.PI],
        ],
      ],
      Z: [
        [
          new THREE.Mesh(
            new THREE.CylinderGeometry(0.2, 0, 0.6, 4),
            matInvisible
          ),
          [0, 0, 0.3],
          [Math.PI / 2, 0, 0],
        ],
        [
          new THREE.Mesh(
            new THREE.CylinderGeometry(0.2, 0, 0.6, 4),
            matInvisible
          ),
          [0, 0, -0.3],
          [-Math.PI / 2, 0, 0],
        ],
      ],
      XY: [
        [
          new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.01), matInvisible),
          [0.15, 0.15, 0],
        ],
      ],
      YZ: [
        [
          new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.01), matInvisible),
          [0, 0.15, 0.15],
          [0, Math.PI / 2, 0],
        ],
      ],
      XZ: [
        [
          new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.01), matInvisible),
          [0.15, 0, 0.15],
          [-Math.PI / 2, 0, 0],
        ],
      ],
      XYZ: [
        [
          new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), matInvisible),
          [0, 0, 0],
        ],
      ],
    };

    const helperScale = {
      X: [
        [
          new THREE.Line(lineGeometry, matHelper.clone()),
          [-1e3, 0, 0],
          null,
          [1e6, 1, 1],
          "helper",
        ],
      ],
      Y: [
        [
          new THREE.Line(lineGeometry, matHelper.clone()),
          [0, -1e3, 0],
          [0, 0, Math.PI / 2],
          [1e6, 1, 1],
          "helper",
        ],
      ],
      Z: [
        [
          new THREE.Line(lineGeometry, matHelper.clone()),
          [0, 0, -1e3],
          [0, -Math.PI / 2, 0],
          [1e6, 1, 1],
          "helper",
        ],
      ],
    };

    // Creates an Object3D with gizmos described in custom hierarchy definition.

    function setupGizmo(gizmoMap) {
      const gizmo = new THREE.Object3D();

      for (const name in gizmoMap) {
        for (let i = gizmoMap[name].length; i--; ) {
          const object = gizmoMap[name][i][0].clone();
          const position = gizmoMap[name][i][1];
          const rotation = gizmoMap[name][i][2];
          const scale = gizmoMap[name][i][3];
          const tag = gizmoMap[name][i][4];

          // name and tag properties are essential for picking and updating logic.
          object.name = name;
          object.tag = tag;

          if (position) {
            object.position.set(position[0], position[1], position[2]);
          }

          if (rotation) {
            object.rotation.set(rotation[0], rotation[1], rotation[2]);
          }

          if (scale) {
            object.scale.set(scale[0], scale[1], scale[2]);
          }

          object.updateMatrix();

          const tempGeometry = object.geometry.clone();
          tempGeometry.applyMatrix4(object.matrix);
          object.geometry = tempGeometry;
          object.renderOrder = Infinity;

          object.position.set(0, 0, 0);
          object.rotation.set(0, 0, 0);
          object.scale.set(1, 1, 1);

          gizmo.add(object);
        }
      }

      return gizmo;
    }

    // Gizmo creation

    this.gizmo = {};
    this.picker = {};
    this.helper = {};

    this.add((this.gizmo["translate"] = setupGizmo(gizmoTranslate)));
    this.add((this.gizmo["rotate"] = setupGizmo(gizmoRotate)));
    this.add((this.gizmo["scale"] = setupGizmo(gizmoScale)));
    this.add((this.picker["translate"] = setupGizmo(pickerTranslate)));
    this.add((this.picker["rotate"] = setupGizmo(pickerRotate)));
    this.add((this.picker["scale"] = setupGizmo(pickerScale)));
    this.add((this.helper["translate"] = setupGizmo(helperTranslate)));
    this.add((this.helper["rotate"] = setupGizmo(helperRotate)));
    this.add((this.helper["scale"] = setupGizmo(helperScale)));

    // Pickers should be hidden always

    this.picker["translate"].visible = false;
    this.picker["rotate"].visible = false;
    this.picker["scale"].visible = false;
  }

  // updateMatrixWorld will update transformations and appearance of individual handles

  updateMatrixWorld(force) {
    const space = this.mode === "scale" ? "local" : this.space; // scale always oriented to local rotation

    const quaternion =
      space === "local" ? this.worldQuaternion : _identityQuaternion;

    // Show only gizmos for current transform mode

    this.gizmo["translate"].visible = this.mode === "translate";
    this.gizmo["rotate"].visible = this.mode === "rotate";
    this.gizmo["scale"].visible = this.mode === "scale";

    this.helper["translate"].visible = this.mode === "translate";
    this.helper["rotate"].visible = this.mode === "rotate";
    this.helper["scale"].visible = this.mode === "scale";

    let handles = [];
    handles = handles.concat(this.picker[this.mode].children);
    handles = handles.concat(this.gizmo[this.mode].children);
    handles = handles.concat(this.helper[this.mode].children);

    for (let i = 0; i < handles.length; i++) {
      const handle = handles[i];

      // hide aligned to camera

      handle.visible = true;
      handle.rotation.set(0, 0, 0);
      handle.position.copy(this.worldPosition);

      let factor;

      if (this.camera.isOrthographicCamera) {
        factor = (this.camera.top - this.camera.bottom) / this.camera.zoom;
      } else {
        factor =
          this.worldPosition.distanceTo(this.cameraPosition) *
          Math.min(
            (1.9 * Math.tan((Math.PI * this.camera.fov) / 360)) /
              this.camera.zoom,
            7
          );
      }

      handle.scale.set(1, 1, 1).multiplyScalar((factor * this.size) / 4);

      // TODO: simplify helpers and consider decoupling from gizmo

      if (handle.tag === "helper") {
        handle.visible = false;

        if (handle.name === "AXIS") {
          handle.position.copy(this.worldPositionStart);
          handle.visible = !!this.axis;

          if (this.axis === "X") {
            _tempQuaternion.setFromEuler(_tempEuler.set(0, 0, 0));
            handle.quaternion.copy(quaternion).multiply(_tempQuaternion);

            if (
              Math.abs(
                _alignVector
                  .copy(_unitX)
                  .applyQuaternion(quaternion)
                  .dot(this.eye)
              ) > 0.9
            ) {
              handle.visible = false;
            }
          }

          if (this.axis === "Y") {
            _tempQuaternion.setFromEuler(_tempEuler.set(0, 0, Math.PI / 2));
            handle.quaternion.copy(quaternion).multiply(_tempQuaternion);

            if (
              Math.abs(
                _alignVector
                  .copy(_unitY)
                  .applyQuaternion(quaternion)
                  .dot(this.eye)
              ) > 0.9
            ) {
              handle.visible = false;
            }
          }

          if (this.axis === "Z") {
            _tempQuaternion.setFromEuler(_tempEuler.set(0, Math.PI / 2, 0));
            handle.quaternion.copy(quaternion).multiply(_tempQuaternion);

            if (
              Math.abs(
                _alignVector
                  .copy(_unitZ)
                  .applyQuaternion(quaternion)
                  .dot(this.eye)
              ) > 0.9
            ) {
              handle.visible = false;
            }
          }

          if (this.axis === "XYZE") {
            _tempQuaternion.setFromEuler(_tempEuler.set(0, Math.PI / 2, 0));
            _alignVector.copy(this.rotationAxis);
            handle.quaternion.setFromRotationMatrix(
              _lookAtMatrix.lookAt(_zeroVector, _alignVector, _unitY)
            );
            handle.quaternion.multiply(_tempQuaternion);
            handle.visible = this.dragging;
          }

          if (this.axis === "E") {
            handle.visible = false;
          }
        } else if (handle.name === "START") {
          handle.position.copy(this.worldPositionStart);
          handle.visible = this.dragging;
        } else if (handle.name === "END") {
          handle.position.copy(this.worldPosition);
          handle.visible = this.dragging;
        } else if (handle.name === "DELTA") {
          handle.position.copy(this.worldPositionStart);
          handle.quaternion.copy(this.worldQuaternionStart);
          _tempVector
            .set(1e-10, 1e-10, 1e-10)
            .add(this.worldPositionStart)
            .sub(this.worldPosition)
            .multiplyScalar(-1);
          _tempVector.applyQuaternion(
            this.worldQuaternionStart.clone().invert()
          );
          handle.scale.copy(_tempVector);
          handle.visible = this.dragging;
        } else {
          handle.quaternion.copy(quaternion);

          if (this.dragging) {
            handle.position.copy(this.worldPositionStart);
          } else {
            handle.position.copy(this.worldPosition);
          }

          if (this.axis) {
            handle.visible = this.axis.search(handle.name) !== -1;
          }
        }

        // If updating helper, skip rest of the loop
        continue;
      }

      // Align handles to current local or world rotation

      handle.quaternion.copy(quaternion);

      if (this.mode === "translate" || this.mode === "scale") {
        // Hide translate and scale axis facing the camera

        const AXIS_HIDE_TRESHOLD = 0.99;
        const PLANE_HIDE_TRESHOLD = 0.2;

        if (handle.name === "X") {
          if (
            Math.abs(
              _alignVector
                .copy(_unitX)
                .applyQuaternion(quaternion)
                .dot(this.eye)
            ) > AXIS_HIDE_TRESHOLD
          ) {
            handle.scale.set(1e-10, 1e-10, 1e-10);
            handle.visible = false;
          }
        }

        if (handle.name === "Y") {
          if (
            Math.abs(
              _alignVector
                .copy(_unitY)
                .applyQuaternion(quaternion)
                .dot(this.eye)
            ) > AXIS_HIDE_TRESHOLD
          ) {
            handle.scale.set(1e-10, 1e-10, 1e-10);
            handle.visible = false;
          }
        }

        if (handle.name === "Z") {
          if (
            Math.abs(
              _alignVector
                .copy(_unitZ)
                .applyQuaternion(quaternion)
                .dot(this.eye)
            ) > AXIS_HIDE_TRESHOLD
          ) {
            handle.scale.set(1e-10, 1e-10, 1e-10);
            handle.visible = false;
          }
        }

        if (handle.name === "XY") {
          if (
            Math.abs(
              _alignVector
                .copy(_unitZ)
                .applyQuaternion(quaternion)
                .dot(this.eye)
            ) < PLANE_HIDE_TRESHOLD
          ) {
            handle.scale.set(1e-10, 1e-10, 1e-10);
            handle.visible = false;
          }
        }

        if (handle.name === "YZ") {
          if (
            Math.abs(
              _alignVector
                .copy(_unitX)
                .applyQuaternion(quaternion)
                .dot(this.eye)
            ) < PLANE_HIDE_TRESHOLD
          ) {
            handle.scale.set(1e-10, 1e-10, 1e-10);
            handle.visible = false;
          }
        }

        if (handle.name === "XZ") {
          if (
            Math.abs(
              _alignVector
                .copy(_unitY)
                .applyQuaternion(quaternion)
                .dot(this.eye)
            ) < PLANE_HIDE_TRESHOLD
          ) {
            handle.scale.set(1e-10, 1e-10, 1e-10);
            handle.visible = false;
          }
        }
      } else if (this.mode === "rotate") {
        // Align handles to current local or world rotation

        _tempQuaternion2.copy(quaternion);
        _alignVector
          .copy(this.eye)
          .applyQuaternion(_tempQuaternion.copy(quaternion).invert());

        if (handle.name.search("E") !== -1) {
          handle.quaternion.setFromRotationMatrix(
            _lookAtMatrix.lookAt(this.eye, _zeroVector, _unitY)
          );
        }

        if (handle.name === "X") {
          _tempQuaternion.setFromAxisAngle(
            _unitX,
            Math.atan2(-_alignVector.y, _alignVector.z)
          );
          _tempQuaternion.multiplyQuaternions(
            _tempQuaternion2,
            _tempQuaternion
          );
          handle.quaternion.copy(_tempQuaternion);
        }

        if (handle.name === "Y") {
          _tempQuaternion.setFromAxisAngle(
            _unitY,
            Math.atan2(_alignVector.x, _alignVector.z)
          );
          _tempQuaternion.multiplyQuaternions(
            _tempQuaternion2,
            _tempQuaternion
          );
          handle.quaternion.copy(_tempQuaternion);
        }

        if (handle.name === "Z") {
          _tempQuaternion.setFromAxisAngle(
            _unitZ,
            Math.atan2(_alignVector.y, _alignVector.x)
          );
          _tempQuaternion.multiplyQuaternions(
            _tempQuaternion2,
            _tempQuaternion
          );
          handle.quaternion.copy(_tempQuaternion);
        }
      }

      // Hide disabled axes
      handle.visible =
        handle.visible && (handle.name.indexOf("X") === -1 || this.showX);
      handle.visible =
        handle.visible && (handle.name.indexOf("Y") === -1 || this.showY);
      handle.visible =
        handle.visible && (handle.name.indexOf("Z") === -1 || this.showZ);
      handle.visible =
        handle.visible &&
        (handle.name.indexOf("E") === -1 ||
          (this.showX && this.showY && this.showZ));

      // highlight selected axis

      handle.material._color =
        handle.material._color || handle.material.color.clone();
      handle.material._opacity =
        handle.material._opacity || handle.material.opacity;

      handle.material.color.copy(handle.material._color);
      handle.material.opacity = handle.material._opacity;

      if (this.enabled && this.axis) {
        if (handle.name === this.axis) {
          handle.material.color.setHex(0xffff00);
          handle.material.opacity = 1.0;
        } else if (
          this.axis.split("").some(function (a) {
            return handle.name === a;
          })
        ) {
          handle.material.color.setHex(0xffff00);
          handle.material.opacity = 1.0;
        }
      }
    }

    super.updateMatrixWorld(force);
  }
}

TransformControlsGizmo.prototype.isTransformControlsGizmo = true;

//

class TransformControlsPlane extends THREE.Mesh {
  constructor() {
    super(
      new THREE.PlaneGeometry(100000, 100000, 2, 2),
      new THREE.MeshBasicMaterial({
        visible: false,
        wireframe: true,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.1,
        toneMapped: false,
      })
    );

    this.type = "TransformControlsPlane";
  }

  updateMatrixWorld(force) {
    let space = this.space;

    this.position.copy(this.worldPosition);

    if (this.mode === "scale") space = "local"; // scale always oriented to local rotation

    _v1
      .copy(_unitX)
      .applyQuaternion(
        space === "local" ? this.worldQuaternion : _identityQuaternion
      );
    _v2
      .copy(_unitY)
      .applyQuaternion(
        space === "local" ? this.worldQuaternion : _identityQuaternion
      );
    _v3
      .copy(_unitZ)
      .applyQuaternion(
        space === "local" ? this.worldQuaternion : _identityQuaternion
      );

    // Align the plane for current transform mode, axis and space.

    _alignVector.copy(_v2);

    switch (this.mode) {
      case "translate":
      case "scale":
        switch (this.axis) {
          case "X":
            _alignVector.copy(this.eye).cross(_v1);
            _dirVector.copy(_v1).cross(_alignVector);
            break;
          case "Y":
            _alignVector.copy(this.eye).cross(_v2);
            _dirVector.copy(_v2).cross(_alignVector);
            break;
          case "Z":
            _alignVector.copy(this.eye).cross(_v3);
            _dirVector.copy(_v3).cross(_alignVector);
            break;
          case "XY":
            _dirVector.copy(_v3);
            break;
          case "YZ":
            _dirVector.copy(_v1);
            break;
          case "XZ":
            _alignVector.copy(_v3);
            _dirVector.copy(_v2);
            break;
          case "XYZ":
          case "E":
            _dirVector.set(0, 0, 0);
            break;
        }

        break;
      case "rotate":
      default:
        // special case for rotate
        _dirVector.set(0, 0, 0);
    }

    if (_dirVector.length() === 0) {
      // If in rotate mode, make the plane parallel to camera
      this.quaternion.copy(this.cameraQuaternion);
    } else {
      _tempMatrix.lookAt(_tempVector.set(0, 0, 0), _dirVector, _alignVector);

      this.quaternion.setFromRotationMatrix(_tempMatrix);
    }

    super.updateMatrixWorld(force);
  }
}

TransformControlsPlane.prototype.isTransformControlsPlane = true;

const getNumber = (value) => {
  return parseFloat(value.toFixed(2));
};

const isTouch = (() => {
  return (
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    navigator.msMaxTouchPoints > 0
  );
})();

const STARTEVENT = (() => {
  return isTouch ? "touchstart" : "mousedown";
})();

const ENDEVENT = (() => {
  return isTouch ? "touchend" : "mouseup";
})();

window.setTimeout(() => {
  new Editor();
}, 100);
