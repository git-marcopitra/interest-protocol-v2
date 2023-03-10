import { useTranslations } from 'next-intl';
import { prop } from 'ramda';
import { FC, useState } from 'react';
import { useAccount } from 'wagmi';

import { incrementTX } from '@/api/analytics';
import { Box, Button, Typography } from '@/elements';
import { LoadingSVG } from '@/svg';
import {
  capitalize,
  extractCreateTokenEvent,
  isValidAccount,
  safeGetAddress,
  showToast,
  showTXSuccessToast,
  throwError,
} from '@/utils';
import {
  GAPage,
  GAStatus,
  GAType,
  logTransactionEvent,
} from '@/utils/analytics';

import { useCreateToken } from './create-token-form.hooks';
import { CreateTokenButtonProps } from './create-token-form.types';

const CreateTokenButton: FC<CreateTokenButtonProps> = ({
  chainId,
  getValues,
  control,
  addLocalToken,
  handleCloseModal,
}) => {
  const [loading, setLoading] = useState(false);
  const t = useTranslations();
  const { address } = useAccount();
  const {
    useContractWriteReturn: { writeAsync: createToken },
  } = useCreateToken(chainId, control);

  const handleCreateToken = async () => {
    try {
      setLoading(true);
      const [name, symbol] = [getValues('name'), getValues('symbol')];

      const tx = await createToken?.();

      await showTXSuccessToast(tx, chainId);
      incrementTX(address ?? '');

      logTransactionEvent({
        status: GAStatus.Success,
        type: GAType.Write,
        page: GAPage.Faucet,
        functionName: 'handleCreateToken',
      });

      if (tx) {
        const receipt = await tx.wait();

        const { token } = extractCreateTokenEvent(receipt);

        if (isValidAccount(token))
          addLocalToken({
            symbol,
            name,
            address: safeGetAddress(token),
          });
      }
    } catch (error) {
      logTransactionEvent({
        status: GAStatus.Error,
        type: GAType.Write,
        page: GAPage.Faucet,
        functionName: 'handleCreateToken',
      });
      throwError(t('error.generic'), error);
    } finally {
      setLoading(false);
      handleCloseModal();
    }
  };

  const safeCreateToken = () =>
    showToast(handleCreateToken(), {
      loading: `${t('faucet.modalButton', { isLoading: 1 })}`,
      success: capitalize(t('common.success')),
      error: prop('message'),
    });

  return (
    <Button
      mt="L"
      width="100%"
      variant="primary"
      disabled={loading || !createToken}
      onClick={safeCreateToken}
      hover={{ bg: 'accentAlternativeActive' }}
      bg={loading || !createToken ? 'disabled' : 'accentAlternative'}
      cursor={loading || !createToken ? 'not-allowed' : 'pointer'}
    >
      {loading ? (
        <Box display="flex" alignItems="center" justifyContent="center">
          <Box as="span" display="inline-block" width="1rem">
            <LoadingSVG width="100%" maxHeight="1rem" maxWidth="1rem" />
          </Box>
          <Typography
            fontSize="S"
            variant="normal"
            ml="M"
            textTransform="capitalize"
          >
            {t('faucet.modalButton', { isLoading: 1 })}
          </Typography>
        </Box>
      ) : (
        t('faucet.modalButton', { isLoading: 0 })
      )}
    </Button>
  );
};

export default CreateTokenButton;
