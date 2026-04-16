export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(200).send('OK')
  }

  try {
    // body取得（Vercel対策）
    const body = typeof req.body === 'string'
      ? JSON.parse(req.body)
      : req.body

    console.log('body:', body)

    if (!body || !body.events || body.events.length === 0) {
      return res.status(200).send('OK')
    }

    const event = body.events[0]
    console.log('event:', event)

    if (
      event.type !== 'message' ||
      !event.message ||
      event.message.type !== 'text'
    ) {
      return res.status(200).send('OK')
    }

    const userMessage = event.message.text
    const replyToken = event.replyToken

    // ===== OpenAIに送信 =====
    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: [
          {
            role: 'system',
            content: 'あなたは優秀な秘書です。丁寧で分かりやすく日本語で答えてください。'
          },
          {
            role: 'user',
            content: userMessage
          }
        ]
      })
    })

    const data = await aiResponse.json()
    console.log('OpenAI response:', data)

    const replyText =
      data?.choices?.[0]?.message?.content || 'すみません、うまく答えられませんでした。'

    // ===== LINEに返信 =====
    await fetch('https://api.line.me/v2/bot/message/reply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        replyToken: replyToken,
        messages: [
          {
            type: 'text',
            text: replyText
          }
        ]
      })
    })

    return res.status(200).send('OK')

  } catch (error) {
    console.error('ERROR:', error)
    return res.status(200).send('OK')
  }
}
