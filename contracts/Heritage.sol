//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Heritage is Ownable {
    uint256 MAX_INT = 2**256 - 1;

    event NewTestator(
        address inheritor,
        Status status,
        uint256 proofTimestamp,
        IERC20 token,
        uint16 maxDays
    );

    event ProofUpdated(address testator, uint256 timestamp);

    event Inherited(address _testator, address _inheritor, uint256 _balance);

    enum Status {
        ACTIVE,
        INACTIVE,
        INHERITED
    }

    struct Testator {
        address inheritor;
        Status status;
        uint256 proofTimestamp;
        IERC20 token;
        uint16 maxDays;
    }

    Testator[] private testators;

    mapping(address => uint256) private testatorIndexes;
    mapping(address => address) private testatorToInheritor;
    mapping(address => address) private inheritorToTestator;

    modifier onlyTestator() {
        require(
            testatorIndexes[msg.sender] >= 0,
            "The address is not a valid testator."
        );
        _;
    }

    modifier onlyActive() {
        require(
            testators[testatorIndexes[msg.sender]].status == Status.ACTIVE,
            "The address holder is not active."
        );
        _;
    }

    modifier onlyInheritor() {
        require(
            testatorIndexes[
                testatorToInheritor[inheritorToTestator[msg.sender]]
            ] >= 0,
            "The address is not a valid inheritor."
        );
        _;
    }

    modifier onlyInactive() {
        require(
            testators[testatorIndexes[msg.sender]].status == Status.INACTIVE,
            "The address holder is not inactive."
        );
        _;
    }

    // TODO: Validate parameters;
    function addTestator(
        address _inheritor,
        address _token,
        uint16 _maxDays
    ) public {
        IERC20 token = IERC20(_token);

        // TODO: Validate if this is a valid token somehow.
        testators.push(
            Testator(
                _inheritor,
                Status.ACTIVE,
                block.timestamp,
                token,
                _maxDays
            )
        );

        uint256 index = testators.length - 1;

        testatorIndexes[msg.sender] = index;
        testatorToInheritor[msg.sender] = _inheritor;
        inheritorToTestator[_inheritor] = msg.sender;

        token.approve(_inheritor, MAX_INT);

        emit NewTestator(
            testators[index].inheritor,
            testators[index].status,
            testators[index].proofTimestamp,
            testators[index].token,
            testators[index].maxDays
        );
    }

    function getTestator()
        public
        view
        returns (
            address,
            Status,
            uint256,
            IERC20
        )
    {
        uint256 index = testatorIndexes[msg.sender];
        Testator memory _testator = testators[index];

        return (
            _testator.inheritor,
            _testator.status,
            _testator.proofTimestamp,
            _testator.token
        );
    }

    function updateProof() public onlyTestator onlyActive {
        uint256 _timestamp = block.timestamp;

        uint256 _maxDays = testators[testatorIndexes[msg.sender]].maxDays;
        uint256 _proofTimestamp = testators[testatorIndexes[msg.sender]]
            .proofTimestamp;

        if (_timestamp >= _proofTimestamp + _maxDays * 1 days) {
            testators[testatorIndexes[msg.sender]].status = Status.INACTIVE;

            revert("The user cannot update the alive pprof");
        }

        testators[testatorIndexes[msg.sender]].proofTimestamp = _timestamp;

        emit ProofUpdated(msg.sender, _timestamp);
    }

    function inherit() public onlyInheritor onlyInactive {
        Testator storage _testator = testators[
            testatorIndexes[
                testatorToInheritor[inheritorToTestator[msg.sender]]
            ]
        ];
        uint256 _balance = _testator.token.balanceOf(
            inheritorToTestator[msg.sender]
        );

        _testator.token.transfer(msg.sender, _balance);

        _testator.status = Status.INHERITED;

        emit Inherited(inheritorToTestator[msg.sender], msg.sender, _balance);
    }
}
