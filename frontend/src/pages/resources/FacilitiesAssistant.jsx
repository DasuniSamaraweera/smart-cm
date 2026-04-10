import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Bot, HelpCircle, MessageCircle, Mic, MicOff, Send, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

const typeKeywords = {
  LAB: ['lab', 'labs', 'laboratory'],
  LECTURE_HALL: ['lecture', 'hall', 'lecture hall'],
  MEETING_ROOM: ['meeting', 'room', 'meeting room'],
  EQUIPMENT: ['equipment', 'camera', 'projector', 'device'],
}

function detectType(query) {
  const q = query.toLowerCase()
  return Object.entries(typeKeywords).find(([, words]) => words.some((w) => q.includes(w)))?.[0]
}

function detectCapacity(query) {
  const match = query.match(/(\d{1,4})/)
  return match ? Number(match[1]) : null
}

function buildResourceReply(query, resources) {
  const q = query.toLowerCase().trim()

  if (!q) {
    return {
      text: 'Ask about facilities only. Example: "active labs for 40 students".',
      filterPatch: null,
    }
  }

  if (q.includes('help') || q.includes('what can you do')) {
    return {
      text: 'I can help you find campus resources by type, capacity, location, and status. Try: "show active meeting rooms" or "labs for 30".',
      filterPatch: null,
    }
  }

  const requestedType = detectType(q)
  const requestedCapacity = detectCapacity(q)
  const wantsOutOfService = q.includes('out of service') || q.includes('unavailable')
  const wantsActive =
    q.includes('active') || q.includes('available') || (!wantsOutOfService && q.includes('show'))

  let filtered = resources

  if (requestedType) {
    filtered = filtered.filter((r) => r.type === requestedType)
  }

  if (requestedCapacity !== null) {
    filtered = filtered.filter((r) => (r.capacity ?? 0) >= requestedCapacity)
  }

  if (wantsOutOfService) {
    filtered = filtered.filter((r) => r.status === 'OUT_OF_SERVICE')
  } else if (wantsActive) {
    filtered = filtered.filter((r) => r.status === 'ACTIVE')
  }

  if (filtered.length === 0) {
    return {
      text: 'No matching facilities found. Try relaxing one filter, such as capacity or status.',
      filterPatch: {
        type: requestedType || '',
        status: wantsOutOfService ? 'OUT_OF_SERVICE' : wantsActive ? 'ACTIVE' : '',
        minCapacity: requestedCapacity,
      },
    }
  }

  const top = filtered.slice(0, 4)
  const list = top
    .map((r) => {
      const capacityText = r.capacity ? ` | capacity ${r.capacity}` : ''
      return `- ${r.name} (${r.location})${capacityText}`
    })
    .join('\n')

  const summary = `Found ${filtered.length} matching resource${filtered.length > 1 ? 's' : ''}.`

  return {
    text: `${summary}\n${list}`,
    filterPatch: {
      type: requestedType || '',
      status: wantsOutOfService ? 'OUT_OF_SERVICE' : wantsActive ? 'ACTIVE' : '',
      minCapacity: requestedCapacity,
    },
  }
}

export default function FacilitiesAssistant({ resources, onApplyFilters }) {
  const recognitionRef = useRef(null)
  const transcriptRef = useRef('')
  const [isOpen, setIsOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [isVoiceSupported, setIsVoiceSupported] = useState(false)
  const [currentQuestion, setCurrentQuestion] = useState('')
  const [currentReply, setCurrentReply] = useState({
    text: 'Facilities Assistant is ready. I only answer questions about resources in this module.',
    filterPatch: null,
  })

  const suggestionChips = useMemo(
    () => ['Show active labs', 'Meeting rooms for 20', 'Out of service resources'],
    []
  )

  const sendMessage = useCallback((rawText) => {
    const text = rawText.trim()
    if (!text) return

    const reply = buildResourceReply(text, resources)
    setCurrentQuestion(text)
    setCurrentReply(reply)
    setMessage('')
  }, [resources])

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setIsVoiceSupported(false)
      return undefined
    }

    setIsVoiceSupported(true)

    const recognition = new SpeechRecognition()
    recognition.lang = 'en-US'
    recognition.continuous = false
    recognition.interimResults = true
    recognition.maxAlternatives = 1

    recognition.onresult = (event) => {
      let transcript = ''
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        transcript += event.results[i][0].transcript
      }

      transcriptRef.current = transcript.trim()
      setMessage(transcriptRef.current)
    }

    recognition.onend = () => {
      setIsListening(false)

      if (transcriptRef.current) {
        sendMessage(transcriptRef.current)
        transcriptRef.current = ''
      }
    }

    recognition.onerror = () => {
      setIsListening(false)
      setCurrentReply({
        text: 'Voice input failed. Please check microphone permissions and try again.',
        filterPatch: null,
      })
    }

    recognitionRef.current = recognition

    return () => {
      try {
        recognition.stop()
      } catch {
        // no-op cleanup
      }
      recognitionRef.current = null
    }
  }, [sendMessage])

  const toggleVoiceInput = () => {
    if (!isVoiceSupported || !recognitionRef.current) return

    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
      return
    }

    transcriptRef.current = ''
    setMessage('')

    try {
      recognitionRef.current.start()
      setIsListening(true)
      setCurrentReply({
        text: 'Listening... speak your request clearly.',
        filterPatch: null,
      })
    } catch {
      setIsListening(false)
      setCurrentReply({
        text: 'Unable to start voice input. Please try again.',
        filterPatch: null,
      })
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen && (
        <Card className="mb-3 w-[calc(100vw-2rem)] max-w-md rounded-2xl border-indigo-100 bg-gradient-to-b from-indigo-50/70 to-white shadow-xl">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CardTitle className="flex items-center gap-2 text-base text-slate-900">
                  <Bot className="h-4 w-4" />
                  Facilities Assistant
                </CardTitle>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsOpen(false)}
                aria-label="Close assistant"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="h-56 space-y-3 overflow-y-auto rounded-xl border border-indigo-100 bg-white p-3">
              {currentQuestion ? (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase tracking-[0.1em] text-slate-500">You</p>
                    <div className="text-sm">{currentQuestion}</div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-[0.1em] text-slate-500">Assistant</p>
                    <div className="text-sm whitespace-pre-line">{currentReply.text}</div>
                    {currentReply.filterPatch && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl border-slate-300"
                        onClick={() => onApplyFilters(currentReply.filterPatch)}
                      >
                        Apply these filters
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-[0.1em] text-slate-500">Assistant</p>
                  <div className="text-sm whitespace-pre-line">{currentReply.text}</div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {suggestionChips.map((chip) => (
                <Button
                  key={chip}
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-xl border-slate-300 bg-white"
                  onClick={() => sendMessage(chip)}
                >
                  <MessageCircle className="h-3.5 w-3.5 mr-1" />
                  {chip}
                </Button>
              ))}
            </div>

            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                if (isListening && recognitionRef.current) {
                  recognitionRef.current.stop()
                }
                sendMessage(message)
              }}
            >
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ask about facilities (type, status, capacity, location)"
                className="rounded-xl border-slate-200 bg-slate-50"
              />
              {isVoiceSupported && (
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className={`rounded-xl border-slate-300 ${isListening ? 'bg-rose-50 text-rose-600 border-rose-300' : ''}`}
                  onClick={toggleVoiceInput}
                  aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
                >
                  {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
              )}
              <Button type="submit" size="icon" className="rounded-xl bg-indigo-600 text-white hover:bg-indigo-700" aria-label="Send assistant message">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Button
        type="button"
        size="icon"
        className="h-12 w-12 rounded-2xl bg-indigo-600 text-white shadow-lg hover:bg-indigo-700"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Open facilities assistant"
      >
        <HelpCircle className="h-5 w-5" />
      </Button>
    </div>
  )
}
