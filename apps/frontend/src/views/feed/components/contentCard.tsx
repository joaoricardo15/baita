import {
  Chat as ChatIcon,
  Favorite as FavoriteIcon,
  People as PeopleIcon,
} from '@mui/icons-material'
import {
  Avatar,
  Card,
  CardContent,
  CardHeader,
  CardMedia,
  Divider,
} from '@mui/material'
import { FC } from 'react'

import { ComponentProps, Text } from '../../../components'
import { IContent } from '../../../models/user'
import { getTimeDiffLabel } from '../../../utils/date'

const ContentCard: FC<{ content: IContent } & ComponentProps> = ({
  content,
  className,
  style,
}) => {
  return (
    <Card className={className} style={{ ...style, borderRadius: 12 }}>
      <CardHeader
        avatar={
          content.author.image ? (
            <Avatar src={content.author.image} />
          ) : content.url ? (
            <Avatar
              src={`https://www.google.com/s2/favicons?sz=64&domain_url=${content.url}`}
            />
          ) : (
            <></>
          )
        }
        title={
          <div className="d-flex justify-content-between">
            <Text className="fs-4 fw-bolder text-primary">
              {content.author.name}
            </Text>
          </div>
        }
      />
      {content.author.accountName && (
        <>
          <Divider />
          <div className="m-2">
            <div className="d-flex ">
              <Text className="text-primary fw-bolder">{`@${content.author.accountName}`}</Text>
              {content.author.followers && (
                <div className="d-flex align-items-center mx-3">
                  <PeopleIcon className="text-info fs-5" />
                  <Text className="text-info" style={{ marginLeft: 1 }}>
                    {content.author.followers}
                  </Text>
                </div>
              )}
            </div>
            <Text className="text-secondary p-1 fs-6">
              {content.author.description}
            </Text>
          </div>
          <Divider />
        </>
      )}
      <CardContent className="d-grid align-items-between p-0">
        {content.image ? (
          <CardMedia style={{ height: 300 }} image={content.image} />
        ) : (
          <></>
        )}
        <div className="m-3">
          <Text className="text-primary fw-bolder">
            {content.header}. (
            {content.author.location ? `${content.author.location}, ` : ''}
            {getTimeDiffLabel(content.date)})
          </Text>

          <Text
            className={`text-secondary mt-4 ${!content.image ? 'fs-3' : ''}`}
          >
            {content.body}
          </Text>
          {(content.comments || content.likes) && (
            <div className="d-flex mt-4">
              {content.comments && (
                <div className="d-flex">
                  <ChatIcon className="text-success fs-2" />
                  <Text className="text-primary mx-1">{content.comments}</Text>
                </div>
              )}
              {content.likes && (
                <div className="d-flex">
                  <FavoriteIcon className="text-error fs-2" />
                  <Text className="text-primary mx-1">{content.likes}</Text>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default ContentCard
