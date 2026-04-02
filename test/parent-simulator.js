/**
 * 父站模拟器 - 用于测试 iframe 集成
 * 在浏览器中运行，模拟父站发送 postMessage 消息
 */

class ParentStationSimulator {
  constructor(options = {}) {
    this.options = {
      childOrigin: '*',
      debug: true,
      ...options,
    }

    this.childWindow = null
    this.messageHandlers = {}
    this.messageHistory = []
    this.setupMessageListener()
    this.lastRealToken = null

    if (this.options.debug) {
      console.log('父站模拟器已初始化', this.options)
    }
  }

  // 设置消息监听器
  setupMessageListener() {
    window.addEventListener('message', event => {
      // 可以添加 origin 验证
      // if (event.origin !== 'http://localhost:5173') return;

      this.handleChildMessage(event.data, event)
    })
  }

  // 处理子站消息
  handleChildMessage(message, event) {
    this.messageHistory.push({
      type: 'received',
      message,
      timestamp: Date.now(),
      event,
    })

    if (this.options.debug) {
      console.log('收到子站消息:', message)
    }

    // 触发已注册的消息处理器
    if (this.messageHandlers[message.type]) {
      this.messageHandlers[message.type](message, event)
    }

    // 内置处理器
    if (message.type === 'READY') {
      if (this.options.debug) {
        console.log('子站已就绪，发送TOKEN...')
      }
      this.sendToken()
    } else if (message.type === 'REFRESH_TOKEN') {
      if (this.options.debug) {
        console.log('子站请求刷新token，发送新TOKEN...')
      }
      this.sendToken(true)
    }
  }

  // 注册消息处理器
  on(messageType, handler) {
    this.messageHandlers[messageType] = handler
  }

  // 发送消息到子站
  sendToChild(message) {
    const iframe = document.querySelector('iframe')
    if (!iframe || !iframe.contentWindow) {
      console.error('未找到iframe或iframe未加载完成')
      return false
    }

    const fullMessage = {
      ...message,
      timestamp: message.timestamp || Date.now(),
      id: message.id || 'msg_' + Date.now(),
    }

    try {
      iframe.contentWindow.postMessage(fullMessage, this.options.childOrigin)

      this.messageHistory.push({
        type: 'sent',
        message: fullMessage,
        timestamp: Date.now(),
      })

      if (this.options.debug) {
        console.log('已发送消息到子站:', fullMessage)
      }

      return true
    } catch (error) {
      console.error('发送消息失败:', error)
      return false
    }
  }

  // 获取真实TOKEN（调用登录接口）
  async fetchRealToken(username, password) {
    if (this.options.debug) {
      console.log('正在获取真实TOKEN，用户名:', username)
    }

    try {
      // 调用登录接口
      const response = await fetch('/dev/aiums/auth/login/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          username: username,
          password: password
        })
      })

      if (!response.ok) {
        throw new Error(`登录失败: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()

      if (data.code !== 200 && data.code !== 201) {
        throw new Error(`登录返回错误: ${data.msg || '未知错误'}`)
      }

      // 从响应中获取原始token
      const rawToken = data.data?.token
      if (!rawToken) {
        throw new Error('登录响应中未找到token')
      }

      // 按照 useLogin.ts 中的格式编码token
      const timestamp = Date.now()
      const encodedToken = 'Basic' + btoa(encodeURI(rawToken + ':' + timestamp))

      if (this.options.debug) {
        console.log('获取真实TOKEN成功:', {
          rawToken: rawToken.substring(0, 20) + '...',
          timestamp,
          encodedToken: encodedToken.substring(0, 50) + '...'
        })
      }

      return {
        token: encodedToken,
        expireAt: timestamp + 3600000, // 1小时后过期
        userInfo: data.data?.userInfo || {
          userId: data.data?.userId || 'unknown',
          code: data.data?.code || 0,
          roleType: data.data?.roleType || '',
          permList: data.data?.permList || '[]',
          userMode: data.data?.userMode || '',
          username: username
        }
      }
    } catch (error) {
      console.error('获取真实TOKEN失败:', error)
      // 失败时返回测试token
      return this.createTestToken()
    }
  }

  // 创建测试TOKEN（备用）
  createTestToken() {
    const token = 'Basic' + btoa(encodeURI('test-jwt-token-' + Date.now() + ':' + Date.now()))
    return {
      token,
      expireAt: Date.now() + 3600000, // 1小时后过期
      userInfo: {
        userId: '123456',
        code: 0,
        roleType: 'admin',
        permList: '[]',
        userMode: '',
        username: 'testuser'
      }
    }
  }
  // 发送TOKEN消息
  async sendToken(isRefresh = false) {
    if (this.options.debug) {
      console.log('发送TOKEN消息，使用真实登录接口获取token...')
    }
    
    try {
      // 使用真实用户名密码获取token
      const tokenData = await this.fetchRealToken('admin@ailink.com', 'Ailink123456')
      
      this.lastRealToken = tokenData.token
      const message = {
        type: 'TOKEN',
        payload: {
          token: tokenData.token,
          expireAt: tokenData.expireAt,
          userInfo: tokenData.userInfo
        },
      }
      
      this.sendToChild(message)
      
      if (this.options.debug) {
        console.log('已发送真实TOKEN消息:', {
          token: tokenData.token.substring(0, 50) + '...',
          expireAt: new Date(tokenData.expireAt).toLocaleString(),
          userInfo: tokenData.userInfo
        })
      }
    } catch (error) {
      console.error('发送TOKEN失败:', error)
      // 失败时发送测试token作为后备
      const tokenData = this.createTestToken()
      const message = {
        type: 'TOKEN',
        payload: {
          token: tokenData.token,
          expireAt: tokenData.expireAt,
          userInfo: tokenData.userInfo
        },
      }
      this.sendToChild(message)
    }
  }

  // 发送LOGOUT消息
  sendLogout(reason = '用户主动登出') {
    const message = {
      type: 'LOGOUT',
      payload: { reason },
    }

    this.sendToChild(message)
  }

  // 发送自定义消息
  sendCustomMessage(type, payload) {
    const message = {
      type,
      payload,
    }

    this.sendToChild(message)
  }

  // 模拟token过期（用于测试刷新机制）
  simulateTokenExpiry() {
    if (this.options.debug) {
      console.log('模拟token过期场景...')
    }

    // 修改本地存储的过期时间为过去
    const currentExpireAt = localStorage.getItem('aiumsTokenExpireAt')
    if (currentExpireAt) {
      const newExpireAt = Date.now() - 1000
      localStorage.setItem('aiumsTokenExpireAt', newExpireAt)

      if (this.options.debug) {
        console.log(
          `已将token过期时间从 ${new Date(parseInt(currentExpireAt)).toLocaleString()} 修改为 ${new Date(newExpireAt).toLocaleString()}`,
        )
      }
    } else {
      console.warn('未找到aiumsTokenExpireAt，无法模拟过期')
    }
  }

  // 获取消息历史
  getMessageHistory() {
    return this.messageHistory
  }

  // 清空消息历史
  clearMessageHistory() {
    this.messageHistory = []
  }

  // 验证消息格式
  static validateMessageFormat(message, expectedType) {
    const errors = []

    if (!message.type) errors.push('缺少type字段')
    if (!message.payload) errors.push('缺少payload字段')
    if (!message.timestamp) errors.push('缺少timestamp字段')
    if (!message.id) errors.push('缺少id字段')

    if (expectedType && message.type !== expectedType) {
      errors.push(`消息类型不匹配: 期望${expectedType}, 实际${message.type}`)
    }

    if (message.type === 'TOKEN') {
      if (!message.payload.token) errors.push('TOKEN消息缺少token字段')
      if (!message.payload.expireAt && !message.payload.expireIn) {
        errors.push('TOKEN消息缺少expireAt或expireIn字段')
      }
    }

    if (message.type === 'LOGOUT' && !message.payload.reason) {
      errors.push('LOGOUT消息缺少reason字段')
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }
}

// 消息生成工具
const MessageGenerator = {
  createReadyMessage() {
    return {
      type: 'READY',
      payload: {},
      timestamp: Date.now(),
      id: 'ready_' + Date.now(),
    }
  },

  createTokenMessage(token, expireAt, userInfo = {}) {
    return {
      type: 'TOKEN',
      payload: {
        token,
        expireAt,
        userInfo,
      },
      timestamp: Date.now(),
      id: 'token_' + Date.now(),
    }
  },

  createRefreshTokenMessage() {
    return {
      type: 'REFRESH_TOKEN',
      payload: {},
      timestamp: Date.now(),
      id: 'refresh_' + Date.now(),
    }
  },

  createLogoutMessage(reason = '用户主动登出') {
    return {
      type: 'LOGOUT',
      payload: { reason },
      timestamp: Date.now(),
      id: 'logout_' + Date.now(),
    }
  },
}

// 测试工具
const TestUtils = {
  // 检查本地存储
  checkLocalStorage() {
    const token = localStorage.getItem('aiumsToken')
    const expireAt = localStorage.getItem('aiumsTokenExpireAt')
    const userInfo = {}

    // 检查所有aiums-前缀的用户信息字段
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key.startsWith('aiums-')) {
        userInfo[key] = localStorage.getItem(key)
      }
    }

    return {
      token: token ? '存在' : '不存在',
      expireAt: expireAt ? `${expireAt} (${new Date(parseInt(expireAt)).toLocaleString()})` : '不存在',
      userInfo,
      raw: { token, expireAt },
    }
  },

  // 清空相关本地存储
  clearAuthStorage() {
    localStorage.removeItem('aiumsToken')
    localStorage.removeItem('aiumsTokenExpireAt')

    // 删除所有aiums-前缀的字段
    const keysToRemove = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key.startsWith('aiums-')) {
        keysToRemove.push(key)
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key))
    return keysToRemove.length
  },

  // 模拟HTTP 401响应
  simulateAuthFailure() {
    console.log('模拟HTTP 401错误...')

    // 触发iframeAuth的handleAuthFailure方法
    const iframe = document.querySelector('iframe')
    if (iframe && iframe.contentWindow) {
      const message = {
        type: 'AUTH_FAILURE',
        payload: { status: 401, message: 'Unauthorized' },
        timestamp: Date.now(),
        id: 'auth_failure_' + Date.now(),
      }

      iframe.contentWindow.postMessage(message, '*')
      console.log('已发送AUTH_FAILURE模拟消息')
    }
  },
}

// 导出到全局
if (typeof window !== 'undefined') {
  window.ParentStationSimulator = ParentStationSimulator
  window.MessageGenerator = MessageGenerator
  window.TestUtils = TestUtils

  // 自动创建默认实例
  window.parentSimulator = new ParentStationSimulator()

  console.log('父站模拟器已加载，使用 window.parentSimulator 访问')
  console.log('可用方法:')
  console.log('- parentSimulator.sendToken() - 发送TOKEN消息')
  console.log('- parentSimulator.sendLogout() - 发送LOGOUT消息')
  console.log('- parentSimulator.simulateTokenExpiry() - 模拟token过期')
  console.log('- TestUtils.checkLocalStorage() - 检查本地存储')
  console.log('- TestUtils.clearAuthStorage() - 清空认证存储')
}
