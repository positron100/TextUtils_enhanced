import React from 'react'

export default function Alert(props) {
    return (
        <>
        <div className="container">

        <div className={`alert alert-${props.alert.T} alert-dismissible fade show`} role="alert">
                {props.alert.M}
                {/* <button type="button" className="btn-close" data-bs-dismiss="alert" aria-label="Close"></button> */}
            </div>
        </div>
            
        </>
    )
}
