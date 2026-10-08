import React, { useMemo } from 'react';
import styled from 'styled-components';
import { v4 } from 'uuid';
import classNames from 'classnames';
import Label from '@/components/elements/Label';
import Input from '@/components/elements/Input';

const ToggleContainer = styled.div`
    position: relative;
    user-select: none;
    width: 3rem;
    line-height: 1.5;

    & > input[type='checkbox'] {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border-width: 0;

        &:focus-visible + label {
            outline: 2px solid #78d4cc;
            outline-offset: 2px;
        }

        &:checked + label {
            background-color: #237c7f;
            border-color: #1d5558;
            box-shadow: none;
        }

        &:checked + label:before {
            right: 0.125rem;
        }
    }

    & > label {
        margin-bottom: 0;
        display: block;
        overflow: hidden;
        cursor: pointer;
        background-color: #39424b;
        border: 1px solid #78838f;
        border-radius: 9999px;
        height: 1.5rem;
        box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.06);
        transition: all 75ms linear;

        &::before {
            position: absolute;
            display: block;
            background-color: #d7dce1;
            border: 1px solid #bbc2ca;
            height: 1.25rem;
            width: 1.25rem;
            border-radius: 9999px;
            top: 0.125rem;
            right: calc(50% + 0.125rem);
            content: '';
            transition: all 75ms ease-in;
        }
    }
`;

export interface SwitchProps {
    name: string;
    label?: string;
    description?: string;
    defaultChecked?: boolean;
    readOnly?: boolean;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    children?: React.ReactNode;
}

const Switch = ({ name, label, description, defaultChecked, readOnly, onChange, children }: SwitchProps) => {
    const uuid = useMemo(() => v4(), []);

    return (
        <div className={'flex items-center'}>
            <ToggleContainer className={'flex-none'}>
                {children || (
                    <Input
                        id={uuid}
                        name={name}
                        type={'checkbox'}
                        onChange={(e) => onChange && onChange(e)}
                        defaultChecked={defaultChecked}
                        disabled={readOnly}
                    />
                )}
                <Label htmlFor={uuid} />
            </ToggleContainer>
            {(label || description) && (
                <div className={'ml-4 w-full'}>
                    {label && (
                        <Label className={classNames('cursor-pointer', !!description && 'mb-0')} htmlFor={uuid}>
                            {label}
                        </Label>
                    )}
                    {description && <p className={'mt-2 text-sm text-neutral-400'}>{description}</p>}
                </div>
            )}
        </div>
    );
};

export default Switch;
