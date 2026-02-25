// ==UserScript==
// @name         E-Hentai Multi Upload Queue
// @namespace    https://upload.e-hentai.org/
// @version      0.1.1
// @description  Select multiple files and upload sequentially.
// @match        https://upload.e-hentai.org/managegallery*
// @author       Arteiimis
// @license      MIT
// @homepageURL  https://github.com/Arteiimis/ehentai-multi-upload.user
// @supportURL   https://github.com/Arteiimis/ehentai-multi-upload.user/issues
// @grant        none
// ==/UserScript==

;(() => {
  'use strict'

  const START_TEXT = 'Start Upload'
  const UPLOADING_TEXT = 'Uploading...'
  const PER_FILE_DELAY_MS = 1000

  let queue = []
  let uploading = false

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  function findStartButton() {
    const buttons = Array.from(
      document.querySelectorAll("button, input[type='button'], input[type='submit']"),
    )
    return (
      buttons.find(btn => {
        const text = (btn.tagName === 'INPUT' ? btn.value : btn.textContent || '').trim()
        return text === START_TEXT || text === UPLOADING_TEXT
      }) || null
    )
  }

  function findFileInput() {
    return document.querySelector("input[type='file']")
  }

  function findUploadForm() {
    const fileInput = findFileInput()
    return fileInput ? fileInput.closest('form') : null
  }

  function setStartButtonState(button, isUploading) {
    if (!button) {
      return
    }
    if (button.tagName === 'INPUT') {
      button.value = isUploading ? UPLOADING_TEXT : START_TEXT
    } else {
      button.textContent = isUploading ? UPLOADING_TEXT : START_TEXT
    }
    button.disabled = isUploading
  }

  function ensureProgressNode(startBtn) {
    if (!startBtn) {
      return null
    }
    if (startBtn.dataset.multiUploadProgressId) {
      const existing = document.getElementById(startBtn.dataset.multiUploadProgressId)
      if (existing) {
        return existing
      }
    }

    const node = document.createElement('div')
    node.style.marginTop = '6px'
    node.style.fontSize = '12px'
    node.style.color = '#666'
    node.style.display = 'block'
    node.style.minHeight = '14px'
    node.textContent = ''

    const id = `multi-upload-progress-${Math.random().toString(36).slice(2)}`
    node.id = id
    startBtn.dataset.multiUploadProgressId = id

    const parent = startBtn.parentElement
    if (parent) {
      parent.appendChild(node)
      return node
    }

    const form = findUploadForm()
    if (form) {
      form.appendChild(node)
      return node
    }

    return null
  }

  function escapeCssValue(value) {
    if (window.CSS && typeof window.CSS.escape === 'function') {
      return window.CSS.escape(value)
    }
    return value.replace(/"/g, '\\"')
  }

  function syncHiddenInputs(fromForm, toForm) {
    const hiddenInputs = Array.from(
      fromForm.querySelectorAll("input[type='hidden'][name]"),
    )
    hiddenInputs.forEach(input => {
      const name = input.getAttribute('name')
      const selector = `input[type="hidden"][name="${escapeCssValue(name)}"]`
      const current = toForm.querySelector(selector)
      if (current) {
        current.value = input.value
      } else {
        const clone = input.cloneNode(true)
        toForm.appendChild(clone)
      }
    })
  }

  async function submitFormViaXhr(startBtn) {
    const form = findUploadForm()
    if (!form) {
      return false
    }

    const action = form.action || window.location.href
    const method = (form.method || 'POST').toUpperCase()
    const formData = new FormData(form)

    const progressNode = ensureProgressNode(startBtn)

    return new Promise(resolve => {
      const xhr = new XMLHttpRequest()
      xhr.open(method, action, true)
      xhr.withCredentials = true

      setStartButtonState(startBtn, true)
      if (progressNode) {
        progressNode.textContent = 'Uploading...'
      }

      xhr.upload.onprogress = event => {
        if (!progressNode) {
          return
        }
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100)
          progressNode.textContent = `Uploading... ${percent}%`
        } else {
          progressNode.textContent = 'Uploading...'
        }
      }

      xhr.onprogress = () => {
        if (progressNode && !progressNode.textContent) {
          progressNode.textContent = 'Uploading...'
        }
      }

      xhr.onload = () => {
        const ok = xhr.status >= 200 && xhr.status < 300
        if (ok) {
          const doc = new DOMParser().parseFromString(xhr.responseText, 'text/html')
          const newForm = doc.querySelector('form')
          if (newForm) {
            syncHiddenInputs(newForm, form)
          }
        }
        if (progressNode) {
          progressNode.textContent = ''
        }
        setStartButtonState(startBtn, false)
        resolve(ok)
      }

      xhr.onerror = () => {
        if (progressNode) {
          progressNode.textContent = ''
        }
        setStartButtonState(startBtn, false)
        resolve(false)
      }

      xhr.send(formData)
    })
  }

  function waitForReady() {
    return new Promise(resolve => {
      const check = () => {
        const startBtn = findStartButton()
        if (!startBtn) {
          resolve(false)
          return
        }
        const text = (
          startBtn.tagName === 'INPUT' ? startBtn.value : startBtn.textContent || ''
        ).trim()
        if (!startBtn.disabled && text === START_TEXT) {
          resolve(true)
        } else {
          requestAnimationFrame(check)
        }
      }
      check()
    })
  }

  async function uploadNext() {
    if (uploading) {
      return
    }
    if (queue.length === 0) {
      return
    }

    uploading = true

    const fileInput = findFileInput()
    const startBtn = findStartButton()

    if (!fileInput || !startBtn) {
      alert('Could not find file input or Start Upload button.')
      queue = []
      uploading = false
      return
    }

    const file = queue.shift()

    const dataTransfer = new DataTransfer()
    dataTransfer.items.add(file)
    fileInput.files = dataTransfer.files
    fileInput.dispatchEvent(new Event('change', { bubbles: true }))

    await sleep(PER_FILE_DELAY_MS)

    const submitted = await submitFormViaXhr(startBtn)
    if (!submitted) {
      startBtn.click()
      const ready = await waitForReady()
      if (!ready) {
        alert('Upload queue stopped: Start Upload button not ready.')
        queue = []
        uploading = false
        return
      }
    }

    uploading = false
    if (queue.length > 0) {
      uploadNext()
    } else {
      await sleep(2000)
      window.location.reload()
    }
  }

  function addMultiSelectButton() {
    const fileInput = findFileInput()
    if (!fileInput || fileInput.dataset.multiUploadBound === '1') {
      return
    }

    fileInput.dataset.multiUploadBound = '1'

    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = 'Multi Upload'
    button.style.marginLeft = '8px'

    const hiddenInput = document.createElement('input')
    hiddenInput.type = 'file'
    hiddenInput.multiple = true
    hiddenInput.style.display = 'none'

    button.addEventListener('click', () => {
      hiddenInput.click()
    })

    hiddenInput.addEventListener('change', () => {
      const files = Array.from(hiddenInput.files || [])
      if (files.length === 0) {
        return
      }
      queue.push(...files)
      hiddenInput.value = ''
      uploadNext()
    })

    const parent = fileInput.parentElement
    if (parent) {
      parent.appendChild(button)
      parent.appendChild(hiddenInput)
    }
  }

  function init() {
    addMultiSelectButton()

    const observer = new MutationObserver(() => {
      addMultiSelectButton()
    })

    observer.observe(document.body, { childList: true, subtree: true })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
