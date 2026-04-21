export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(200).send('OK');
  }

  try {
    const body = req.body;

    if (!body || !body.events || body.events.length === 0) {
      return res.status(200).send('OK');
    }

    const event = body.events[0];

    if (
      event.type !== 'message' ||
      !event.message ||
      event.message.type !== 'text'
    ) {
      return res.status(200).send('OK');
    }

    const userMessage = event.message.text.trim();
    const replyToken = event.replyToken;
    const sourceType = event.source?.type;

    // グループ・複数人トークでは「秘書さん」か「秘書さんAI」が含まれる時だけ反応
    if (
      (sourceType === 'group' || sourceType === 'room') &&
      !userMessage.includes('秘書さん') &&
      !userMessage.includes('秘書さんAI')
    ) {
      return res.status(200).send('OK');
    }

    // 呼びかけ語を除去して質問を自然化
    const cleanedMessage = userMessage
      .replace(/秘書さんAI/g, '')
      .replace(/秘書さん/g, '')
      .replace(/^[、,\s]+|[、,\s]+$/g, '')
      .trim();

    const finalUserMessage =
      cleanedMessage || '呼ばれたので、自然に短く返事してください。';

    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: [
          {
            role: 'system',
            content: `
あなたは「秘書さんAI」です。
フランクで相談しやすい相棒タイプですが、礼儀正しく丁寧な日本語で回答してください。

【基本方針】
・まずはユーザーの質問そのものに素直に答える
・必要以上に行政、市役所、市営バス、観光、まちづくりの話へ広げない
・一般的な相談、日常の質問、仕事の壁打ち、文章作成、整理、分析など幅広く対応する
・質問内容が行政、観光、市営バス、まちづくりに関係するときだけ、その分野の視点を活かす
・ユーザーが専門的な視点を明示的に求めない限り、まずは一般的で自然な回答を優先する

【回答スタイル】
・まず結論を簡潔に述べる
・必要に応じて理由や提案を続ける
・LINEで読みやすい長さを意識する
・曖昧な相談でも、意図をくみ取って整理する
・押しつけがましくならず、自然に答える
・長くなりすぎる場合は、要点を優先する

【口調】
・親しみやすいが軽すぎない
・丁寧で落ち着いた秘書口調

【追加ルール】
・「仕事モードで」「行政視点で」「市バス目線で」などの指定があれば、そのモードを優先する
・グループ内では、呼ばれた時だけ自然に返答する
`,
          },
          {
            role: 'user',
            content: finalUserMessage,
          },
        ],
      }),
    });

    const data = await aiResponse.json();

    if (!data.choices) {
      console.error('OpenAI error:', data);
      throw new Error('OpenAI error');
    }

    const replyText =
      data.choices?.[0]?.message?.content ||
      'すみません、うまく回答できませんでした。';

    await fetch('https://api.line.me/v2/bot/message/reply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        replyToken: replyToken,
        messages: [
          {
            type: 'text',
            text: replyText.slice(0, 4900),
          },
        ],
      }),
    });

    return res.status(200).send('OK');
  } catch (error) {
    console.error('ERROR:', error);

    try {
      const body = req.body;
      const event = body?.events?.[0];

      if (event?.replyToken) {
        await fetch('https://api.line.me/v2/bot/message/reply', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
          },
          body: JSON.stringify({
            replyToken: event.replyToken,
            messages: [
              {
                type: 'text',
                text: 'すみません、現在うまく回答できませんでした。',
              },
            ],
          }),
        });
      }
    } catch (e) {
      console.error('LINE reply error:', e);
    }

    return res.status(200).send('OK');
  }
}
