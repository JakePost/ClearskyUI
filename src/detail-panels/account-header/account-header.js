// @ts-check
/// <reference path="../../types.d.ts" />

import React, { useState } from 'react';

import { unwrapShortDID, unwrapShortHandle } from '../../api';
import { FormatTimestamp } from '../../common-components/format-timestamp';
import { FullDID, FullHandle } from '../../common-components/full-short';

import './account-header.css';
import { localise } from '../../localisation';
import { Button } from '@mui/material';

/**
 * @param {{
 *  className?: string,
 *  account: Partial<AccountInfo> & { loading?: boolean },
 *  handleHistory?: [handle: string, date: string][],
 *  onInfoClick?: () => void,
 *  onCloseClick?: () => void
 * }} _ 
 */
export function AccountHeader({
  className,
  account,
  handleHistory,
  onInfoClick,
  onCloseClick }) {
  const [isCopied, setIsCopied] = useState(false);
  const [handleHistoryExpanded, setHandleHistoryExpanded] = useState(false);

  const handleShortDIDClick = () => {
    // Copy the shortDID to the clipboard
    const modifiedShortDID = unwrapShortDID(account.shortDID);
    const textField = document.createElement('textarea');
    textField.innerText = modifiedShortDID;
    document.body.appendChild(textField);
    textField.select();
    document.execCommand('copy');
    textField.remove();

    // Show the "Copied to Clipboard" message
    setIsCopied(true);

    // Hide the message after a delay (e.g., 3 seconds)
    setTimeout(() => {
      setIsCopied(false);
    }, 3000);
  };

  return (
    <div className={className}>
      <h1 style={{ margin: 0 }}>
        {
          typeof onCloseClick !== 'function' ? undefined :
            <button
              title={localise('Back to homepage', { uk: 'Повернутися до головної сторінки' })}
              className='account-close-button'
              onClick={onCloseClick}>&lsaquo;</button>
        }

        <div className='account-banner' style={{
          backgroundImage: account.bannerUrl ? `url(${account.bannerUrl})` : 'transparent'
        }}>
        </div>

        <span className='account-avatar-and-displayName-line'>
          <span className='account-banner-overlay'></span>
          <span className='account-avatar' style={{
            backgroundImage: account.avatarUrl ? `url(${account.avatarUrl})` : 'transparent'
          }}></span>
          <span className='account-displayName'>
            {
              account.displayName ||
              <span style={{ opacity: '0.5' }}><FullHandle shortHandle={account.shortHandle} /></span>
            }
          </span>
          {
            !account.displayName ? undefined :
              <span className='account-handle'>
                <span className='account-handle-at'>@</span>
                <a href={`https://bsky.app/profile/${unwrapShortHandle(account.shortHandle)}`} target="_blank">
                  <FullHandle shortHandle={account.shortHandle} />
                </a>
              </span>
          }
          <Button className='history-toggle' variant='text' onClick={onInfoClick}>
            {
              handleHistory && handleHistory.length > 0 && handleHistory[handleHistory.length - 1][1]
                ? <FormatTimestamp timestamp={handleHistory[handleHistory.length - 1][1]} noTooltip />
                : 'Unknown Date'
            }
            <span className='info-icon'></span>
          </Button>
        </span>
      </h1>
      <div>
      </div>
    </div>
  );
}

/**
 * @param {{
 * handleHistory?: [handle: string, date: string][]
 * }} _
 */
function HandleHistory({ handleHistory }) {
  if (!handleHistory?.length) return undefined;

  return (
    <div>
      {handleHistory.map(([handle, date], index) => (
        <div key={index}>
          <FullHandle shortHandle={handle} />{' '}<FormatTimestamp timestamp={date} noTooltip />
        </div>
      ))}
    </div>
  );
}
