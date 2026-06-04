import { withAuthenticationRequired } from '@auth0/auth0-react'
import { FC, useContext, useEffect, useState } from 'react'
import { CardSwiper } from 'react-card-rotate-swiper'
import { TwitterTweetEmbed } from 'react-twitter-embed'

import { Button, EmptyState, Loading, Logo, Skeleton } from '@/components'
import { IContent } from '@baita/shared'
import { NotificationContext } from '@/providers/notification'
import { UserContext } from '@/providers/user'
import { getLabels, Labels } from '@/utils/labels'
import ContentCard from './components/contentCard'

export const Feed: FC = () => {
  const { contents, popContent, retrieveContent, reactToContent } =
    useContext(UserContext)
  const { showSnack } = useContext(NotificationContext)

  const [fetching, setFetching] = useState(false)

  const onSwipe = (direction: string, content: IContent) => {
    if (direction !== 'none') {
      popContent()

      if (direction === 'up') {
        if (content.url) {
          try {
            const parsed = new URL(content.url)
            if (['http:', 'https:'].includes(parsed.protocol)) {
              setTimeout(() => {
                window.open(content.url, '_blank', 'noreferrer')
              })
            } else {
              showSnack('Invalid URL protocol', 'error')
            }
          } catch {
            showSnack('Invalid URL', 'error')
          }
        } else {
          showSnack('No URL for this content 😫', 'error')
        }
      }

      if (direction === 'down') {
        reactToContent(content, 'skip')
        showSnack('Skip', 'info')
      }

      if (direction === 'right') {
        reactToContent(content, 'like')
        showSnack('Like', 'success')
      }

      if (direction === 'left') {
        reactToContent(content, 'dislike')
        showSnack('Dislike', 'error')
      }
    }
  }

  const updateContent = () => {
    setFetching(true)
    retrieveContent().then(() => setFetching(false))
  }

  useEffect(() => {
    if (!contents || contents.length === 0) {
      updateContent()
    }
  }, [])

  return (
    <>
      {!contents || fetching ? (
        <Skeleton
          elements={1}
          height="100%"
          style={{ height: 'calc(100vh - 80px)' }}
        />
      ) : contents.length === 0 ? (
        <>
          <EmptyState
            icon={<Logo size={80} />}
            title={labels.noContent}
            description={labels.noContentHint}
          />
          <div className="d-flex align-items-center justify-content-center mt-5">
            <Button type="text" color="primary" onClick={() => updateContent()}>
              {labels.refresh}
            </Button>
          </div>
        </>
      ) : (
        <div
          className="position-relative"
          style={{ height: 'calc(100vh - 80px)' }}
        >
          {contents.slice(-2).map((content, index) => (
            <div
              key={content.contentId}
              className="w-100 position-absolute top-0"
              style={{ zIndex: index, height: 'calc(100vh - 80px)' }}
            >
              <CardSwiper
                throwLimit={5000}
                onSwipe={(direction: string) => onSwipe(direction, content)}
                contents={
                  content.source === 'Twitter' ? (
                    <div
                      style={{
                        height: 'calc(100vh - 80px)',
                        background: 'white',
                        overflow: 'hidden',
                      }}
                    >
                      <TwitterTweetEmbed
                        tweetId={content.contentId}
                        placeholder={
                          <Skeleton elements={1} height="calc(100vh - 80px)" />
                        }
                        onLoad={(el) => {
                          el.style.margin = '0'
                          const iFrame = el.querySelector('iframe')
                          iFrame.style.height = 'calc(100vh - 80px)'
                          iFrame.style.pointerEvents = 'none'
                          iFrame.style.background = 'white'
                        }}
                      />
                    </div>
                  ) : (
                    <ContentCard
                      style={{ height: 'calc(100vh - 80px)' }}
                      content={content}
                    />
                  )
                }
              />
            </div>
          ))}
        </div>
      )}
    </>
  )
}

export default withAuthenticationRequired(Feed, {
  onRedirecting: () => <Loading />,
})

const LABELS: Labels = {
  en: {
    noContent: 'No content yet',
    noContentHint: 'Your feed will show content from your connected services.',
    refresh: 'Refresh',
  },
  pt: {
    noContent: 'Nenhum conteudo ainda',
    noContentHint: 'Seu feed mostrara conteudo dos seus servicos conectados.',
    refresh: 'Atualizar',
  },
}

const labels = getLabels(LABELS)
