
define(function(require) {

  var Room = require('./Room')
  var raycaster = new THREE.Raycaster
  var ray = new THREE.Ray


  /**
   * Ищет 3д обьект для взаимодействия
   * 
   * @param {BMControl} self 
   * 
   * @returns Object - info about object | false
   */
  function findObject(self) {

    raycaster.setFromCamera( self.mouse, self.scene.camera ) 
    var intersects = raycaster.intersectObjects( self.objects )

    if(intersects.length) 
      return intersects[0]

    return false

  }

  /**
   * Проверяет пересечение и расчитывает допустимое положение объкта по отношению
   * к плэйну.
   * 
   * @param {CubeMesh} obj - проверяемый объект 
   * @param {Wall} p - проверяемый плэйн 
   * @param {Vector3} point - позиция передвижения 
   * 
   * @returns { point: [ x, z ] } || false
   */
  function getFixedPos(obj, p, point) {

    // ищем проецкию позицию передвижения на плэйн
    ray.set(point, p.rvec.clone().multiplyScalar(-1))
    var pos = ray.intersectPlane(p, new THREE.Vector3)
    
    if(pos) {
      // проверяем вхождение точки в зону действия плэйна
      // когда мышь в пределах комнаты
      if( (pos.x > p.max.x || pos.x < p.min.x) || (pos.z > p.max.z || pos.z < p.min.z) ) 
        return false

    } else {

      // когда мышь за пределами комнаты
      var angle = p.point1.angleTo(p.point2) - p.point1.angleTo(point) - p.point2.angleTo(point)

      if(+angle.toFixed(10) < 0) return false

    }
  
    // ищем предельеные точки объекта, которые выходят за пределы плэйна
    var points = obj.toRectY()
    var isOver = false
    var over_poses = points.map(pt => {
  
      ray.set(pt, p.rvec)
      var res = ray.intersectPlane(p, new THREE.Vector3)
      if(res) isOver = true
  
      return res
  
    })
  
    // если нет точки вышелшей за пределы - все ок
    if(!isOver) return false
  
    // находим точку дальше всего выходящую за пределы плэйна
    var idx, distance = 0
    for(let i = 0; i < over_poses.length; i++) {
  
      if(!over_poses[i]) continue
  
      var ndist = over_poses[i].distanceTo(points[i])
      if(ndist >= distance) {
        distance = ndist
        idx = i
      }
  
    }
  
    // подсчитываем допустимые координаты
    var nx = point.x - (points[idx].x - over_poses[idx].x)
    var nz = point.z - (points[idx].z - over_poses[idx].z)
  
    return {
      point: [nx, nz]
    }

  }

  /**
   * Расчет передвижения обьекта
   * 
   * @param {BMControl} self 
   */
  function moveSelected(self) {
    // настраиваем кастер и пуляем луч в мэш пола
    raycaster.setFromCamera( self.mouse, self.scene.camera )
    var intersect = raycaster.ray.intersectPlane( self.room._plane, new THREE.Vector3 )

    // если мимо ничего не делаем
    if(!intersect) return

    // сразу перемещаем конструкцию в место мышки
    self.obj.position.x = intersect.x
    self.obj.position.z = intersect.z

    // ищем первое пересчение и записываем о нем инфу
    var info = null, p

    for(p of self.room._walls) {
      
      info = getFixedPos(self.obj, p, intersect)

      if(info) break
  
    }

    // пересечений нет - значит все ок
    if(!info) {
      if(self.events.onmove) self.events.onmove(self.obj, self.objects, [intersect.x, intersect.z])
      return
    }

    // по полученным данным смещаем инфу о курсоре и сам объект в допустимые координаты
    intersect.x = info.point[0]
    intersect.z = info.point[1]
    self.obj.position.x = info.point[0]
    self.obj.position.z = info.point[1]

    // ищем второе пересчение и записываем о нем инфу
    var info1 = null, p1

    for(p1 of self.room._walls) {
      // исключаем из поиска исправленое пересечение
      if(p1 === p) continue
  
      info1 = getFixedPos(self.obj, p1, intersect)
  
      if(info1) break
  
    }

    // пересечений нет - значит все ок
    if(!info1) {
      if(self.events.onmove) self.events.onmove(self.obj, self.objects, info.point)
      return
    }
  
    // пересчитываем полученные допустимые координаты с учетом первой проверки    
    var vec1 = p.rvec.clone().applyEuler(new THREE.Euler(0, Math.PI/2, 0)).toFixed(10)
    var vec2 = p1.rvec.clone().applyEuler(new THREE.Euler(0, Math.PI/2, 0)).toFixed(10)
  
    ray.origin.set(info.point[0], 0, info.point[1])
    ray.direction.copy(vec1)
    var pos = ray.intersectVec2(vec2, new THREE.Vector3(info1.point[0], 0, info1.point[1]), 'xz')
  
    self.obj.position.x = pos.x
    self.obj.position.z = pos.z

    if(self.events.onmove) self.events.onmove(self.obj, self.objects, [pos.x, pos.z])

  }


  /**
   * exorted Class BMControl
   */

  function BMControl({ scene, points = [], dom = document.body, ocontrol } = {}) {

    this.room = new Room(points)
    this.objects = []
    this.events = {}
    this.obj = null
    this.move = false
    this.mouse = new THREE.Vector2
    this.scene = scene
    this.ocontrol = ocontrol

    var events = {
      mouseMove: mouseMove.bind(this),
      mouseDown: mouseDown.bind(this),
      mouseUp: mouseUp.bind(this)
    }

    this.enable = function(bool) {

      var func = bool ? 'addEventListener' : 'removeEventListener'

      dom[func]('mousemove', events.mouseMove)
      dom[func]('mousedown', events.mouseDown)
      dom[func]('mouseup', events.mouseUp)

      return this

    }

    this.enable(true)

    /**
     * если кнопка мыши была поднята в течении
     * некоторого времени, то выделяем обьект,
     * иначе работает orbit
     */
    this.moveTimeout = null

  }

  BMControl.prototype.selectedObject = function(obj) {

    if(this.ocontrol && this.ocontrol.enabled) {

      this.ocontrol.enabled = false
      
    }

    this.obj = obj.object

    if(this.events.onselected)
      this.events.onselected(obj, this.objects)

  };

  BMControl.prototype.unselectedObject = function(resetOControl) {

    if(resetOControl && this.ocontrol && this.ocontrol.setRotateStart) {
      this.ocontrol.setRotateStart(new THREE.Vector2(...resetOControl))
    }

    if(this.events.onunselected)
      this.events.onunselected(this.obj, this.objects)

    this.obj = null

    if(this.ocontrol && !this.ocontrol.enabled) {

      this.ocontrol.enabled = true
      
    }

  };


  /**
   * Event on dom
   */
  function mouseMove(e) {

    this.mouse.x = (e.clientX / window.innerWidth ) * 2 - 1
    this.mouse.y = - ( e.clientY / window.innerHeight ) * 2 + 1;

    if(this.obj) {

      if(!this.move) return

      moveSelected(this)

    } else {

      var obj = findObject(this)
      
      if(this.events.onview)
        this.events.onview(obj, this.objects)

    }

  }

  /**
   * Event on dom
   */
  function mouseDown(e) {

    this.move = true

    this.mouse.x = (e.clientX / window.innerWidth ) * 2 - 1
    this.mouse.y = - ( e.clientY / window.innerHeight ) * 2 + 1;
    
    var obj = findObject(this)

    if(obj) { 

      if(obj.object !== this.obj && this.obj) {

        this.unselectedObject([e.clientX, e.clientY])

      }

      this.moveTimeout = [
        obj,
        setTimeout((function() {
  
          this.moveTimeout = null
          
        }).bind(this), 200)
      ]

    } else if(this.obj) {

      this.unselectedObject([e.clientX, e.clientY])

    }

  }

  /**
   * Event on dom
   */
  function mouseUp(e) {

    this.move = false

    if(this.moveTimeout) {
      
      clearTimeout(this.moveTimeout[1])

      this.selectedObject(this.moveTimeout[0])
      
      this.moveTimeout = null

    }

  }

  //export
  return BMControl

})
