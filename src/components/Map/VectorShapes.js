import { ref } from 'vue'
import VectorSource from 'ol/source/Vector'
import VectorLayer from 'ol/layer/Vector'
import Draw, { createBox } from 'ol/interaction/Draw'
import Modify from 'ol/interaction/Modify'
import Snap from 'ol/interaction/Snap'
import Translate from 'ol/interaction/Translate'
import Select from 'ol/interaction/Select'
import { Collection } from 'ol'
import { never, click, pointerMove } from 'ol/events/condition'
import { Style, Stroke, Fill } from 'ol/style'
import { Point } from 'ol/geom'
import RegularShape from 'ol/style/RegularShape'

export function useVectorShapes(mapObj) {
  const blockSelect = ref(false)
  const selectedFeature = ref(null)
  const activeFeatureIndex = ref(null)
  let interactionIndex = 0
  const interactions = ref({})

  const customCondition = function (mapBrowserEvent) {
    return click(mapBrowserEvent) || pointerMove(mapBrowserEvent)
  }

  const selectHover = new Select({
    condition: customCondition,
    style: null,
  })

  selectHover.on('select', (evt) => {
    if (!blockSelect.value) {
      const feature = evt.target
        .getFeatures()
        .getArray()?.[0]
        ?.get('features')?.[0]
      if (
        feature &&
        (!selectedFeature.value ||
          selectedFeature.value.ol_uid !== feature.ol_uid)
      ) {
        selectedFeature.value = feature
        if (selectedFeature.value) {
          Object.entries(interactions.value).forEach(([index, interaction]) => {
            if (interaction['feature'] === selectedFeature.value) {
              if (interaction['translate']) {
                interaction['translate'].setActive(true)
              }
              activeFeatureIndex.value = index
            } else {
              if (interaction['translate']) {
                interaction['translate'].setActive(false)
              }
            }
          })
        }
      }
    }
  })

  mapObj.addInteraction(selectHover)

  function isPixelEqual([x1, y1], [x2, y2], tolerance) {
    const dx = x2 - x1
    const dy = y2 - y1
    const distance = Math.sqrt(dx * dx + dy * dy)
    return distance <= tolerance
  }

  function arrowStyleFunction(feature) {
    const geometry = feature.getGeometry()
    const styles = [
      new Style({
        stroke: new Stroke({
          color: '#FF0000',
          width: 2,
        }),
      }),
    ]

    const start = geometry.getCoordinateAt(0)
    const end = geometry.getCoordinateAt(1)
    const dx = end[0] - start[0]
    const dy = end[1] - start[1]
    const rotation = Math.atan2(dy, dx)

    styles.push(
      new Style({
        geometry: new Point(end),
        image: new RegularShape({
          fill: new Fill({ color: '#FF0000' }),
          points: 3,
          radius: 8,
          rotation: -rotation,
          angle: Math.PI / 2,
        }),
      }),
    )

    return styles
  }

  function resetFeatureStyle(id) {
    if (interactions.value[id] && interactions.value[id]['deleteAnimation']) {
      clearInterval(interactions.value[id]['deleteAnimation'].interval)
      interactions.value[id]['feature'].setStyle(
        interactions.value[id]['deleteAnimation'].originalStyle,
      )
      delete interactions.value[id]['deleteAnimation']
    }
  }

  function startDeleteAnimation(feature, id) {
    const originalStyle = feature.getStyle()
    let opacity = 1
    const animationInterval = setInterval(() => {
      opacity -= 0.1
      if (opacity <= 0.2) {
        clearInterval(animationInterval)
      }
      feature.setStyle(
        new Style({
          stroke: new Stroke({
            color: `rgba(255, 0, 0, ${opacity})`,
            width: 2,
          }),
        }),
      )
    }, 150)

    interactions.value[id]['deleteAnimation'] = {
      interval: animationInterval,
      originalStyle: originalStyle,
    }
  }

  function deleteFeature(id) {
    interactions.value[id]['source'].removeFeature(
      interactions.value[id]['feature'],
    )
    if (interactions.value[id]['modify']) {
      mapObj.removeInteraction(interactions.value[id]['modify'])
    }
    mapObj.removeInteraction(interactions.value[id]['snap'])
    if (interactions.value[id]['translate']) {
      mapObj.removeInteraction(interactions.value[id]['translate'])
    }

    document.removeEventListener(
      'keydown',
      interactions.value[id]['eventListeners'].keydown,
    )
    mapObj
      .getViewport()
      .removeEventListener(
        'touchstart',
        interactions.value[id]['eventListeners'].touchstart,
      )
    mapObj
      .getViewport()
      .removeEventListener(
        'touchend',
        interactions.value[id]['eventListeners'].touchend,
      )
    mapObj
      .getViewport()
      .removeEventListener(
        'touchmove',
        interactions.value[id]['eventListeners'].touchmove,
      )

    delete interactions.value[id]
  }

  function addDeleteFunctionality(id) {
    const handleKeyDown = (event) => {
      if (interactions.value[id]['feature'] === selectedFeature.value) {
        if (event.key === 'Delete') {
          deleteFeature(id)
        }
      }
    }

    let longPressTimer
    const longPressDuration = 1500
    const handleTouchStart = (event) => {
      if (event.touches.length === 1) {
        const feature = interactions.value[id]['feature']
        const pixel = mapObj.getEventPixel(event.touches[0])
        const featureAtPixel = mapObj.forEachFeatureAtPixel(pixel, (f) => f)

        if (
          featureAtPixel === feature ||
          featureAtPixel?.get('features')?.[0] === feature
        ) {
          startDeleteAnimation(feature, id)

          longPressTimer = setTimeout(() => {
            deleteFeature(id)
          }, longPressDuration)
        }
      }
    }

    const handleTouchEnd = () => {
      resetFeatureStyle(id)
      clearTimeout(longPressTimer)
    }

    const handleTouchMove = () => {
      resetFeatureStyle(id)
      clearTimeout(longPressTimer)
    }

    document.addEventListener('keydown', handleKeyDown)
    mapObj.getViewport().addEventListener('touchstart', handleTouchStart)
    mapObj.getViewport().addEventListener('touchend', handleTouchEnd)
    mapObj.getViewport().addEventListener('touchmove', handleTouchMove)

    interactions.value[id]['eventListeners'] = {
      keydown: handleKeyDown,
      touchstart: handleTouchStart,
      touchend: handleTouchEnd,
      touchmove: handleTouchMove,
    }
  }

  function addArrow() {
    blockSelect.value = true
    const source = new VectorSource()
    const vector = new VectorLayer({
      source: source,
      style: arrowStyleFunction,
    })
    mapObj.addLayer(vector)

    const id = interactionIndex++
    const interaction = {
      source: source,
      feature: null,
      draw: null,
      snap: null,
      modify: null,
      translate: null,
    }
    interactions.value[id] = interaction

    interaction.draw = new Draw({
      source: source,
      type: 'LineString',
      maxPoints: 2,
      stopClick: true,
    })

    const cancelDrawing = (deleteInteraction) => {
      blockSelect.value = false
      mapObj.removeInteraction(interactions.value[id].draw)
      removeEventListeners()
      if (deleteInteraction) delete interactions.value[id]
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        cancelDrawing(true)
      }
    }

    const handleRightClick = (event) => {
      event.preventDefault()
      cancelDrawing(true)
    }

    const removeEventListeners = () => {
      document.removeEventListener('keydown', handleKeyDown)
      mapObj.getViewport().removeEventListener('contextmenu', handleRightClick)
    }

    document.addEventListener('keydown', handleKeyDown)
    mapObj.getViewport().addEventListener('contextmenu', handleRightClick)

    interaction.draw.on('drawend', (evt) => {
      cancelDrawing()

      const pixelTolerance = 10
      interaction.feature = evt.feature
      interaction.modify = new Modify({
        source: source,
        features: new Collection([interaction.feature]),
        insertVertexCondition: never,
        pixelTolerance: pixelTolerance,
      })

      interaction.snap = new Snap({
        source: source,
        pixelTolerance: 0,
      })

      interaction.translate = new Translate({
        features: new Collection([interaction.feature]),
        hitTolerance: pixelTolerance,
        condition: (event) => {
          const coordinate = mapObj.getPixelFromCoordinate(event.coordinate)
          const geometry = interaction.feature.getGeometry()
          const coordinates = geometry.getCoordinates()
          const startPixel = mapObj.getPixelFromCoordinate(coordinates[0])
          const endPixel = mapObj.getPixelFromCoordinate(
            coordinates[coordinates.length - 1],
          )
          return !(
            isPixelEqual(coordinate, startPixel, pixelTolerance) ||
            isPixelEqual(coordinate, endPixel, pixelTolerance)
          )
        },
      })

      interaction.translate.on('translatestart', () => {
        blockSelect.value = true
      })
      interaction.translate.on('translateend', () => {
        blockSelect.value = false
      })
      interaction.modify.on('modifystart', () => {
        blockSelect.value = true
      })
      interaction.modify.on('modifyend', () => {
        blockSelect.value = false
      })

      addDeleteFunctionality(id)

      mapObj.addInteraction(interaction.modify)
      mapObj.addInteraction(interaction.snap)
      mapObj.addInteraction(interaction.translate)
    })

    mapObj.addInteraction(interaction.draw)
  }

  function addBox() {
    blockSelect.value = true
    const source = new VectorSource()
    const vector = new VectorLayer({
      source: source,
      style: {
        'fill-color': 'rgba(255, 255, 255, 0.2)',
        'stroke-color': '#FF0000',
        'stroke-width': 2,
        'circle-fill-color': '#ffcc33',
      },
    })
    mapObj.addLayer(vector)

    const id = interactionIndex++
    const interaction = {
      source: source,
      feature: null,
      draw: null,
      snap: null,
      modify: null,
      translate: null,
    }
    interactions.value[id] = interaction

    interaction.draw = new Draw({
      source: source,
      type: 'Circle',
      stopClick: true,
      geometryFunction: createBox(),
    })

    const cancelDrawing = (deleteInteraction) => {
      blockSelect.value = false
      mapObj.removeInteraction(interactions.value[id].draw)
      removeEventListeners()
      if (deleteInteraction) delete interactions.value[id]
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        cancelDrawing(true)
      }
    }

    const handleRightClick = (event) => {
      event.preventDefault()
      cancelDrawing(true)
    }

    const removeEventListeners = () => {
      document.removeEventListener('keydown', handleKeyDown)
      mapObj.getViewport().removeEventListener('contextmenu', handleRightClick)
    }

    document.addEventListener('keydown', handleKeyDown)
    mapObj.getViewport().addEventListener('contextmenu', handleRightClick)

    interaction.draw.on('drawend', (evt) => {
      cancelDrawing()

      const pixelTolerance = 10

      interaction.feature = evt.feature
      console.log(evt.feature)
      interaction.snap = new Snap({
        source: source,
        pixelTolerance: 0,
      })
      interaction.modify = new Modify({
        source: source,
        features: new Collection([interaction.feature]),
        insertVertexCondition: never,
        pixelTolerance: pixelTolerance,
      })
      interaction.translate = new Translate({
        features: new Collection([interaction.feature]),
        hitTolerance: pixelTolerance,
      })

      interaction.modify.on('modifystart', () => {
        blockSelect.value = true
      })
      interaction.modify.on('modifyend', () => {
        blockSelect.value = false
      })
      interaction.translate.on('translatestart', () => {
        blockSelect.value = true
      })
      interaction.translate.on('translateend', () => {
        blockSelect.value = false
      })

      addDeleteFunctionality(id)

      mapObj.addInteraction(interaction.translate)
      mapObj.addInteraction(interaction.modify)
      mapObj.addInteraction(interaction.snap)
    })

    mapObj.addInteraction(interaction.draw)
  }

  function addCircle() {
    blockSelect.value = true
    const source = new VectorSource()
    const vector = new VectorLayer({
      source: source,
      style: {
        'fill-color': 'rgba(255, 255, 255, 0.2)',
        'stroke-color': '#FF0000',
        'stroke-width': 2,
        'circle-fill-color': '#ffcc33',
      },
    })
    mapObj.addLayer(vector)

    const id = interactionIndex++
    const interaction = {
      source: source,
      feature: null,
      draw: null,
      snap: null,
      modify: null,
    }
    interactions.value[id] = interaction

    interaction.draw = new Draw({
      source: source,
      type: 'Circle',
      stopClick: true,
    })

    const cancelDrawing = (deleteInteraction) => {
      blockSelect.value = false
      mapObj.removeInteraction(interactions.value[id].draw)
      removeEventListeners()
      if (deleteInteraction) delete interactions.value[id]
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        cancelDrawing(true)
      }
    }

    const handleRightClick = (event) => {
      event.preventDefault()
      cancelDrawing(true)
    }

    const removeEventListeners = () => {
      document.removeEventListener('keydown', handleKeyDown)
      mapObj.getViewport().removeEventListener('contextmenu', handleRightClick)
    }

    document.addEventListener('keydown', handleKeyDown)
    mapObj.getViewport().addEventListener('contextmenu', handleRightClick)

    interaction.draw.on('drawend', (evt) => {
      cancelDrawing()

      const pixelTolerance = 10
      interaction.feature = evt.feature
      interaction.modify = new Modify({
        source: source,
        features: new Collection([interaction.feature]),
        pixelTolerance: pixelTolerance,
      })

      interaction.snap = new Snap({
        source: source,
        pixelTolerance: 0,
      })

      interaction.modify.on('modifystart', () => {
        blockSelect.value = true
      })
      interaction.modify.on('modifyend', () => {
        blockSelect.value = false
      })

      addDeleteFunctionality(id)

      mapObj.addInteraction(interaction.modify)
      mapObj.addInteraction(interaction.snap)
    })

    mapObj.addInteraction(interaction.draw)
  }

  mapObj.getViewport().addEventListener('pointerdown', (evt) => {
    if (!blockSelect.value) {
      const pixel = mapObj.getEventPixel(evt)

      const feature = mapObj.forEachFeatureAtPixel(pixel, (feature) => feature)

      if (!feature && activeFeatureIndex.value) {
        selectedFeature.value = undefined
        const interaction = interactions.value[activeFeatureIndex.value]
        if (interaction && interaction['translate']) {
          interaction['translate'].setActive(false)
        }
        activeFeatureIndex.value = null
      }
    }
  })

  return {
    addArrow,
    addBox,
    addCircle,
    selectedFeature,
  }
}
